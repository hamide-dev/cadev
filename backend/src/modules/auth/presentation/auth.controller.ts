import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  AuthService,
  type AuthResponse,
  type RegistrationResponse,
  type EmailVerifiedResponse,
} from '../application/auth.service.js';
import { AuthSessionService } from '../application/auth-session.service.js';
import type { OAuthIdentity } from '../domain/oauth-identity.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { InitRegistrationDto } from './dto/init-registration.dto.js';
import { CompleteRegistrationDto } from './dto/complete-registration.dto.js';
import { ResendVerificationDto } from './dto/resend-verification.dto.js';
import { RequestLoginCodeDto } from './dto/request-login-code.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { VerifyLoginCodeDto } from './dto/verify-login-code.dto.js';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import {
  OAuthConfigurationGuard,
  OAuthProvider,
} from './oauth-configuration.guard.js';
import type { Environment } from '../../../config/environment.js';

interface OAuthRequest {
  user: OAuthIdentity;
}

type PublicAuthResponse = Pick<AuthResponse, 'expiresIn' | 'user'>;
const ACCESS_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = 2 * 24 * 60 * 60 * 1000;

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authSessionService: AuthSessionService,
    private readonly config: ConfigService<Environment, true>,
  ) {}

  private writeAuthCookies(
    response: Response,
    accessToken: string,
    refreshToken: string,
  ): void {
    const isProduction = process.env.NODE_ENV === 'production';
    response.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
      maxAge: ACCESS_TOKEN_TTL_MS,
    });
    response.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/api/v1/auth',
      maxAge: REFRESH_TOKEN_TTL_MS,
    });
  }

  private clearAuthCookies(response: Response): void {
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? ('none' as const) : ('lax' as const),
    };
    response.clearCookie('access_token', { ...cookieOptions, path: '/' });
    response.clearCookie('refresh_token', {
      ...cookieOptions,
      path: '/api/v1/auth',
    });
  }

  // ---------------------------------------------------------------------------
  // Nouveau flux d'inscription en deux phases
  // ---------------------------------------------------------------------------

  @Post('register/init')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Start registration: validate email and send OTP' })
  initRegistration(
    @Body() input: InitRegistrationDto,
  ): Promise<RegistrationResponse> {
    return this.authService.initRegistration(input);
  }

  @Post('register/complete')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Complete registration: choose username and password (email must be verified first)',
  })
  async completeRegistration(
    @Body() input: CompleteRegistrationDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<PublicAuthResponse> {
    const auth = await this.authService.completeRegistration(input);
    await this.setSessionCookies(response, auth.accessToken);
    return this.toPublicAuthResponse(auth);
  }

  @Get('register/username/:username')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Check if a username is available' })
  async checkUsername(
    @Param('username') username: string,
  ): Promise<{ available: boolean }> {
    return this.authService.checkUsernameAvailability(username);
  }

  // ---------------------------------------------------------------------------
  // Ancien flux (conservé pour compatibilité)
  // ---------------------------------------------------------------------------

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Register and send an email verification code' })
  register(@Body() input: RegisterDto): Promise<RegistrationResponse> {
    return this.authService.register(input);
  }

  @Post('email/verify')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Verify a new account using its emailed code' })
  async verifyEmail(
    @Body() input: VerifyEmailDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<PublicAuthResponse | EmailVerifiedResponse> {
    const result = await this.authService.verifyEmail(input);
    if ('accessToken' in result) {
      await this.setSessionCookies(response, result.accessToken);
      return this.toPublicAuthResponse(result);
    }
    return result;
  }

  @Post('email/resend')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: 'Resend a pending account verification code' })
  resendVerification(
    @Body() input: ResendVerificationDto,
  ): Promise<RegistrationResponse> {
    return this.authService.resendVerificationCode(input.email);
  }

  @Post('login/code')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: 'Send a one-time code for email sign-in' })
  requestLoginCode(
    @Body() input: RequestLoginCodeDto,
  ): Promise<RegistrationResponse> {
    return this.authService.requestLoginCode(input);
  }

  @Post('login/verify')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Sign in using a one-time email code' })
  async verifyLoginCode(
    @Body() input: VerifyLoginCodeDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<PublicAuthResponse> {
    const auth = await this.authService.verifyLoginCode(input);
    await this.setSessionCookies(response, auth.accessToken);
    return this.toPublicAuthResponse(auth);
  }

  @Post('login')
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  @ApiOperation({ summary: 'Sign in with email and password' })
  async login(
    @Body() input: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<PublicAuthResponse> {
    const auth = await this.authService.login(input);
    await this.setSessionCookies(response, auth.accessToken);
    return this.toPublicAuthResponse(auth);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Revoke the refresh token and clear session cookies' })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ success: true }> {
    await this.authSessionService.revoke(request.cookies?.['refresh_token']);
    this.clearAuthCookies(response);
    return { success: true };
  }

  @Post('refresh')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Rotate the refresh token and renew the session' })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ expiresIn: number }> {
    const refreshToken = request.cookies?.['refresh_token'];
    if (!refreshToken) throw new UnauthorizedException();
    const tokens = await this.authSessionService.refresh(refreshToken);
    this.writeAuthCookies(response, tokens.accessToken, tokens.refreshToken);
    return { expiresIn: 24 * 60 * 60 };
  }

  @Post('password/forgot')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: 'Request a password reset code' })
  requestPasswordReset(@Body() input: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(input);
  }

  @Post('password/reset')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Reset a password with an emailed code' })
  resetPassword(@Body() input: ResetPasswordDto) {
    return this.authService.resetPassword(input);
  }

  @Get('google')
  @OAuthProvider('google')
  @UseGuards(OAuthConfigurationGuard, AuthGuard('google'))
  @ApiOperation({ summary: 'Start Google sign-in' })
  googleSignIn(): void {}

  @Get('google/callback')
  @OAuthProvider('google')
  @UseGuards(OAuthConfigurationGuard, AuthGuard('google'))
  @ApiOperation({ summary: 'Complete Google sign-in' })
  async googleCallback(
    @Req() request: OAuthRequest,
    @Res() response: Response,
  ): Promise<void> {
    await this.redirectOAuthResult(request.user, response);
  }

  @Get('github')
  @OAuthProvider('github')
  @UseGuards(OAuthConfigurationGuard, AuthGuard('github'))
  @ApiOperation({ summary: 'Start GitHub sign-in' })
  githubSignIn(): void {}

  @Get('github/callback')
  @OAuthProvider('github')
  @UseGuards(OAuthConfigurationGuard, AuthGuard('github'))
  @ApiOperation({ summary: 'Complete GitHub sign-in' })
  async githubCallback(
    @Req() request: OAuthRequest,
    @Res() response: Response,
  ): Promise<void> {
    await this.redirectOAuthResult(request.user, response);
  }

  private async redirectOAuthResult(
    identity: OAuthIdentity,
    response: Response,
  ): Promise<void> {
    const auth = await this.authService.loginWithOAuth(identity);
    await this.setSessionCookies(response, auth.accessToken);
    const needsOnboarding =
      !auth.user.specialty ||
      !auth.user.experienceLevel ||
      auth.user.interests.length === 0;
    const frontendUrl = this.config.get('CORS_ORIGINS', { infer: true }).split(',')[0]!;
    response.redirect(
      `${frontendUrl}/oauth/callback${needsOnboarding ? '?onboarding=1' : ''}`,
    );
  }

  private toPublicAuthResponse(auth: AuthResponse): PublicAuthResponse {
    return { expiresIn: auth.expiresIn, user: auth.user };
  }

  private async setSessionCookies(
    response: Response,
    accessToken: string,
  ): Promise<void> {
    const refreshToken =
      await this.authSessionService.createRefreshToken(accessToken);
    this.writeAuthCookies(response, accessToken, refreshToken);
  }
}
