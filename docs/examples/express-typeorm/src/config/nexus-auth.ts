import { NexusAuth } from '@nexus-auth/core';
import { TypeORMAdapter } from '@nexus-auth/typeorm-adapter';
import { GoogleProvider } from '@nexus-auth/providers';
import { AppDataSource } from './database';
import { User, Account, Session, VerificationToken } from '../entities';
import { sendEmail } from '../utils/email';

export const nexusAuth = NexusAuth({
  adapter: TypeORMAdapter(AppDataSource, {
    entities: {
      user: User,
      account: Account,
      session: Session,
      verificationToken: VerificationToken,
    },
  }),

  providers: process.env.GOOGLE_CLIENT_ID
    ? [
        GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          redirectUri: `${process.env.APP_URL}/api/auth/callback/google`,
        }),
      ]
    : [],

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 días
  },

  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: '15m', // Access token: 15 minutos
  },

  refreshToken: {
    enabled: true,
    expiresIn: '7d', // Refresh token: 7 días
  },

  password: {
    saltRounds: 10,
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user = {
          id: token.id as string,
          email: token.email as string,
          name: token.name as string,
        };
      }
      return session;
    },
  },

  events: {
    async createUser({ user }) {
      console.log(`[AUTH] New user created: ${user.email}`);

      // Enviar email de bienvenida
      if (process.env.SMTP_HOST) {
        try {
          await sendEmail({
            to: user.email,
            subject: 'Bienvenido a NexusAuth Example',
            html: `
              <h1>¡Bienvenido ${user.name}!</h1>
              <p>Tu cuenta ha sido creada exitosamente.</p>
            `,
          });
        } catch (error) {
          console.error('Error sending welcome email:', error);
        }
      }
    },

    async signIn({ user, account }) {
      console.log(`[AUTH] User signed in: ${user.email} via ${account.provider}`);
    },

    async signOut({ session }) {
      console.log(`[AUTH] User signed out: ${session.user.email}`);
    },
  },
});
