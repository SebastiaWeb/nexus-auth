/**
 * @module @nexus-auth/core
 * 
 * This file is the single source of truth for all core data models and interfaces.
 * All types exported from the root of the package should be defined here.
 */

export interface DefaultSession {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  expires: string; // ISO-8601 date string
}

export interface User {
  id: string;
  name?: string | null;
  email: string;
  emailVerified?: Date | null;
  image?: string | null;
  resetToken?: string | null;
  resetTokenExpiry?: Date | null;
  verificationToken?: string | null;
  verificationTokenExpiry?: Date | null;
}

export interface Account {
  id: string;
  userId: string;
  type: string;
  provider: string;
  providerAccountId: string;
  refresh_token?: string | null;
  access_token?: string | null;
  expires_at?: number | null;
  token_type?: string | null;
  scope?: string | null;
  id_token?: string | null;
  session_state?: string | null;
}

export interface Session {
  sessionToken: string;
  userId: string;
  expires: Date;
  refreshToken?: string | null;
  refreshTokenExpires?: Date | null;
}

export interface BaseAdapter {
  // User methods
  createUser(user: Omit<User, 'id'>): Promise<User>;
  getUser(id: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserByResetToken(resetToken: string): Promise<User | null>;
  getUserByVerificationToken(verificationToken: string): Promise<User | null>;
  updateUser(user: Partial<User> & { id: string }): Promise<User>;
  deleteUser(userId: string): Promise<User | null>;

  // Account methods
  linkAccount(account: Account): Promise<Account>;
  getUserByAccount(data: { provider: string, providerAccountId: string }): Promise<User | null>;
  getAccountByProvider(data: { userId: string, provider: string }): Promise<Account | null>;
  updateAccount(account: Partial<Account> & { id: string }): Promise<Account>;
  unlinkAccount(data: { provider: string, providerAccountId: string }): Promise<Account | null>;

  // Session methods
  createSession(session: {
    sessionToken: string;
    userId: string;
    expires: Date;
    refreshToken?: string;
    refreshTokenExpires?: Date;
  }): Promise<Session>;
  getSessionAndUser(
    sessionToken: string
  ): Promise<{ session: Session; user: User } | null>;
  getSessionByRefreshToken(
    refreshToken: string
  ): Promise<Session | null>;
  updateSession(
    session: Partial<Session> & { sessionToken: string }
  ): Promise<Session | null>;
  deleteSession(sessionToken: string): Promise<Session | null>;
  deleteUserSessions(userId: string): Promise<number>;
}

export interface Provider {
    id: string;
    name: string;
    type: 'oauth' | 'credentials' | 'email';
    signinUrl: string;
    callbackUrl: string;
}

export interface NexusAuthOptions {
  secret: string;
  adapter: BaseAdapter;
  providers: Provider[];
  session?: {
    strategy?: 'jwt' | 'database';
    maxAge?: number; // in seconds
  };
  jwt?: {
    secret?: string;
    maxAge?: number;
  };
  pages?: {
    signIn?: string;
    signOut?: string;
    error?: string;
    verifyRequest?: string;
    newUser?: string | null;
  };
  callbacks?: {
    signIn?: (params: { user: User; account: Account | null; profile?: any; email?: { verificationRequest?: boolean } }) => Promise<boolean | string>;
    redirect?: (params: { url: string; baseUrl: string }) => Promise<string>;
    session?: (params: { session: DefaultSession; user: User; token: JWT }) => Promise<DefaultSession>;
    jwt?: (params: { token: JWT; user?: User; account?: Account | null; profile?: any; isNewUser?: boolean }) => Promise<JWT>;
  };
  events?: {
    signIn?: (message: { user: User; account: Account | null; isNewUser?: boolean }) => Promise<void>;
    signOut?: (message: { session: DefaultSession; token: JWT }) => Promise<void>;
    createUser?: (message: { user: User }) => Promise<void>;
    updateUser?: (message: { user: User }) => Promise<void>;
    linkAccount?: (message: { user: User; account: Account }) => Promise<void>;
    session?: (message: { session: DefaultSession; token: JWT }) => Promise<void>;
  };
}

export interface JWT {
  name?: string;
  email?: string;
  picture?: string;
  sub?: string;
  [key: string]: any;
}