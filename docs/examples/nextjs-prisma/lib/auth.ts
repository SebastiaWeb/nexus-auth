import { NexusAuth } from '@nexus-auth/core';
import { PrismaAdapter } from '@nexus-auth/prisma-adapter';
import { GoogleProvider } from '@nexus-auth/providers';
import { prisma } from './prisma';

export const nexusAuth = NexusAuth({
  adapter: PrismaAdapter(prisma),

  providers: process.env.GOOGLE_CLIENT_ID
    ? [
        GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/google`,
        }),
      ]
    : [],

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 días
  },

  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: '15m',
  },

  refreshToken: {
    enabled: true,
    expiresIn: '7d',
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
    },

    async signIn({ user, account }) {
      console.log(`[AUTH] User signed in: ${user.email} via ${account.provider}`);
    },
  },
});
