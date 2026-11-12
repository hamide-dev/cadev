import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  AuthService,
  type AuthResponse,
  type RegistrationResponse,
  type EmailVerifiedResponse,
} from '../application/auth.service.js';
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

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService<Environment, true>,
  ) {}

  // ---------------------------------------------------------------------------
  // Nouveau flux d'inscription en deux phases
  // ---------------------------------------------------------------------------

  @Post('register/init')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Start registration: validate email and send OTP' })
  initRegistration(@Body() input: InitRegistrationDto): Promise<RegistrationResponse> {
    return this.authService.initRegistration(input);
  }

  @Post('register/complete')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Complete registration: choose username and password (email must be verified first)' })
  completeRegistration(@Body() input: CompleteRegistrationDto): Promise<AuthResponse> {
    return this.authService.completeRegistration(input);
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
  verifyEmail(@Body() input: VerifyEmailDto): Promise<AuthResponse | EmailVerifiedResponse> {
    return this.authService.verifyEmail(input);
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
  verifyLoginCode(@Body() input: VerifyLoginCodeDto): Promise<AuthResponse> {
    return this.authService.verifyLoginCode(input);
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Sign in with email and password' })
  login(@Body() input: LoginDto): Promise<AuthResponse> {
    return this.authService.login(input);
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
    const needsOnboarding =
      !auth.user.specialty ||
      !auth.user.experienceLevel ||
      auth.user.interests.length === 0;
    const frontendUrl = this.config.get('CORS_ORIGINS', { infer: true }).split(',')[0]!;
    const fragment = new URLSearchParams({
      accessToken: auth.accessToken,
      expiresIn: String(auth.expiresIn),
    });
    response.redirect(
      `${frontendUrl}/oauth/callback${needsOnboarding ? '?onboarding=1' : ''}#${fragment.toString()}`,
    );
  }
}
