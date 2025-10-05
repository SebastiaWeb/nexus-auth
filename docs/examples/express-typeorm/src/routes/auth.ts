import { Router } from 'express';
import { nexusAuth } from '../config/nexus-auth';
import { loginLimiter, signupLimiter, passwordResetLimiter } from '../middleware/rateLimit';
import { authenticate } from '../middleware/authenticate';
import {
  signupSchema,
  signinSchema,
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
} from '../utils/validation';
import { sendEmail } from '../utils/email';
import crypto from 'crypto';

const router = Router();

// Signup
router.post('/signup', signupLimiter, async (req, res) => {
  try {
    const data = signupSchema.parse(req.body);

    const { user, token } = await nexusAuth.register(data);

    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validación fallida', details: error.errors });
    }
    res.status(400).json({ error: error.message });
  }
});

// Signin
router.post('/signin', loginLimiter, async (req, res) => {
  try {
    const data = signinSchema.parse(req.body);

    const result = await nexusAuth.signIn(data);

    res.json(result);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validación fallida', details: error.errors });
    }
    res.status(401).json({ error: error.message });
  }
});

// Google OAuth - Iniciar flow
router.get('/google', (req, res) => {
  const state = crypto.randomBytes(32).toString('hex');

  // Guardar state en session o cookie (simplificado para el ejemplo)
  // En producción usar express-session
  res.cookie('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 10 * 60 * 1000, // 10 minutos
  });

  const authUrl = nexusAuth.getAuthorizationUrl('google', { state });
  res.redirect(authUrl);
});

// Google OAuth - Callback
router.get('/callback/google', async (req, res) => {
  try {
    const { code, state } = req.query;

    // Validar state (CSRF protection)
    const savedState = req.cookies.oauth_state;
    if (state !== savedState) {
      return res.status(403).json({ error: 'Invalid state parameter' });
    }

    // Limpiar state cookie
    res.clearCookie('oauth_state');

    const result = await nexusAuth.signIn('google', {
      code: code as string,
    });

    // En producción, redirigir al frontend con el token
    res.redirect(`${process.env.APP_URL}/dashboard?token=${result.accessToken}`);
  } catch (error: any) {
    console.error('OAuth error:', error);
    res.redirect(`${process.env.APP_URL}/login?error=oauth_failed`);
  }
});

// Refresh Token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const result = await nexusAuth.refreshSession(refreshToken);

    res.json(result);
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
});

// Signout
router.post('/signout', authenticate, async (req, res) => {
  try {
    // En NexusAuth con JWT, no hay invalidación de token
    // Pero puedes guardar tokens revocados en una blacklist

    res.json({ success: true, message: 'Signed out successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Password Reset - Request
router.post('/password-reset/request', passwordResetLimiter, async (req, res) => {
  try {
    const { email } = passwordResetRequestSchema.parse(req.body);

    const token = await nexusAuth.createPasswordResetToken(email);

    // Enviar email con token
    if (process.env.SMTP_HOST) {
      await sendEmail({
        to: email,
        subject: 'Reset de Password',
        html: `
          <h1>Reset de Password</h1>
          <p>Haz clic en el siguiente link para resetear tu password:</p>
          <a href="${process.env.APP_URL}/reset-password?token=${token}">Resetear Password</a>
          <p>Este link expira en 1 hora.</p>
        `,
      });
    } else {
      console.log(`Password reset token: ${token}`);
    }

    res.json({
      success: true,
      message: 'Si el email existe, recibirás un link de reset',
    });
  } catch (error: any) {
    // No revelar si el email existe o no (seguridad)
    res.json({
      success: true,
      message: 'Si el email existe, recibirás un link de reset',
    });
  }
});

// Password Reset - Confirm
router.post('/password-reset/confirm', async (req, res) => {
  try {
    const { token, newPassword } = passwordResetConfirmSchema.parse(req.body);

    await nexusAuth.resetPassword(token, newPassword);

    res.json({ success: true, message: 'Password actualizado correctamente' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Verify Email
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }

    await nexusAuth.verifyEmail(token as string);

    res.json({ success: true, message: 'Email verificado correctamente' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
