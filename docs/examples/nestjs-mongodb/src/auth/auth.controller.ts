import { Controller, Post, Get, Body, Query, Res, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { SigninDto } from './dto/signin.dto';
import * as crypto from 'crypto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  async signup(@Body() dto: SignupDto) {
    const user = await this.authService.signup(dto);
    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  @Post('signin')
  @ApiOperation({ summary: 'Sign in with credentials' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  async signin(@Body() dto: SigninDto) {
    return this.authService.signin(dto);
  }

  @Get('google')
  @ApiOperation({ summary: 'Start Google OAuth flow' })
  async googleAuth(@Res() res: Response) {
    const state = crypto.randomBytes(32).toString('hex');

    const authUrl = this.authService.getGoogleAuthUrl(state);

    // En producción, guardar state en sesión
    res.cookie('oauth_state', state, {
      httpOnly: true,
      maxAge: 10 * 60 * 1000,
    });

    res.redirect(authUrl);
  }

  @Get('callback/google')
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    try {
      // Validar state aquí (omitido por simplicidad)

      const result = await this.authService.googleSignIn(code);

      // Redirigir con token
      res.redirect(`${process.env.APP_URL}/dashboard?token=${result.accessToken}`);
    } catch (error) {
      res.status(HttpStatus.UNAUTHORIZED).json({ error: error.message });
    }
  }
}
