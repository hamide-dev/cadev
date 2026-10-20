import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  AuthService,
  type AuthResponse,
  type RegistrationResponse,
} from '../application/auth.service.js';
import type { OAuthIdentity } from '../domain/oauth-identity.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { ResendVerificationDto } from './dto/resend-verification.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import {
  OAuthConfigurationGuard,
  OAuthProvider,
} from './oauth-configuration.guard.js';

interface OAuthRequest {
  user: OAuthIdentity;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Register and send an email verification code' })
  register(@Body() input: RegisterDto): Promise<RegistrationResponse> {
    return this.authService.register(input);
  }

  @Post('email/verify')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Verify a new account using its emailed code' })
  verifyEmail(@Body() input: VerifyEmailDto): Promise<AuthResponse> {
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

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Sign in with email and password' })
  login(@Body() input: LoginDto): Promise<AuthResponse> {
    return this.authService.login(input);
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
  googleCallback(@Req() request: OAuthRequest): Promise<AuthResponse> {
    return this.authService.loginWithOAuth(request.user);
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
  githubCallback(@Req() request: OAuthRequest): Promise<AuthResponse> {
    return this.authService.loginWithOAuth(request.user);
  }
}
