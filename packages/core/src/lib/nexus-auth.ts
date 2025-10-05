import { NexusAuthConfig } from './config.js';
import { User, Account } from './types.js';
import type { JWT } from './config.js';
import * as jwt from './jwt.js';
import * as password from './password.js';
import * as token from './token.js';

export class NexusAuth {
  private config: NexusAuthConfig;

  constructor(config: NexusAuthConfig) {
    this.config = this.mergeWithDefaults(config);

    if (!this.config.adapter) {
      throw new Error('No adapter provided. Please configure an adapter.');
    }

    if (!this.config.secret) {
      throw new Error('No secret provided. Please configure a secret for JWT signing.');
    }
  }

  private mergeWithDefaults(config: NexusAuthConfig): NexusAuthConfig {
    return {
      ...config,
      session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        ...config.session,
      },
      callbacks: {
        ...config.callbacks,
      },
      events: {
        ...config.events,
      },
    };
  }

  // --- Core Methods ---

  /**
   * Register a new user with email and password
   * Returns verification token that should be sent via email
   */
  public async register(credentials: { email: string; password: string; name?: string }): Promise<{
    user: User;
    token: string;
    verificationToken: string;
  }> {
    const { email, password: plainPassword, name } = credentials;

    // Validate input
    if (!email || !plainPassword) {
      throw new Error('Email and password are required');
    }

    // Check if user already exists
    const existingUser = await this.config.adapter.getUserByEmail(email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash the password
    const hashedPassword = await this.hashPassword(plainPassword);

    // Generate email verification token
    const verificationToken = token.generateSecureToken(32);
    const verificationTokenExpiry = token.generateTokenExpiry(24); // 24 hours for email verification

    // Create user in database
    const user = await this.config.adapter.createUser({
      email,
      name: name || null,
      emailVerified: null,
      image: null,
      verificationToken,
      verificationTokenExpiry,
    });

    // Create account (for credentials provider)
    const account: Omit<Account, 'id'> = {
      userId: user.id,
      type: 'credentials',
      provider: 'credentials',
      providerAccountId: user.id,
      access_token: hashedPassword, // Store hashed password in access_token
      refresh_token: null,
      expires_at: null,
      token_type: null,
      scope: null,
      id_token: null,
      session_state: null,
    };

    await this.config.adapter.linkAccount(account as Account);

    // Call createUser event if defined
    if (this.config.events?.createUser) {
      await this.config.events.createUser({ user });
    }

    // Generate JWT token
    let tokenPayload: JWT = {
      sub: user.id,
      email: user.email,
      name: user.name || undefined,
    };

    // Call jwt callback if defined
    if (this.config.callbacks?.jwt) {
      tokenPayload = await this.config.callbacks.jwt({ token: tokenPayload, user });
    }

    const jwtToken = this.generateJwt(tokenPayload);

    return {
      user,
      token: jwtToken,
      verificationToken: user.verificationToken!,
    };
  }

  /**
   * Sign in with email and password (credentials provider)
   */
  public async signIn(credentials: { email: string; password: string }): Promise<{
    user: User;
    token: string;
  }> {
    const { email, password: plainPassword } = credentials;

    // Validate input
    if (!email || !plainPassword) {
      throw new Error('Email and password are required');
    }

    // Get user by email
    const user = await this.config.adapter.getUserByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Get user's credentials account (where password hash is stored)
    const account = await this.config.adapter.getAccountByProvider({
      userId: user.id,
      provider: 'credentials',
    });

    if (!account || !account.access_token) {
      throw new Error('Invalid email or password');
    }

    // The hashed password is stored in the access_token field
    const hashedPassword = account.access_token;

    // Compare passwords
    const isPasswordValid = await this.comparePassword(plainPassword, hashedPassword);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Call signIn event if defined
    if (this.config.events?.signIn) {
      await this.config.events.signIn({ user, account });
    }

    // Generate JWT token
    let tokenPayload: JWT = {
      sub: user.id,
      email: user.email,
      name: user.name || undefined,
    };

    // Call jwt callback if defined
    if (this.config.callbacks?.jwt) {
      tokenPayload = await this.config.callbacks.jwt({ token: tokenPayload, user });
    }

    const token = this.generateJwt(tokenPayload);

    return { user, token };
  }

  /**
   * Request a password reset - generates a reset token and stores it
   * Returns the token that should be sent to the user via email
   */
  public async requestPasswordReset(email: string): Promise<{
    resetToken: string;
    user: User;
  }> {
    // Validate input
    if (!email) {
      throw new Error('Email is required');
    }

    // Get user by email
    const user = await this.config.adapter.getUserByEmail(email);
    if (!user) {
      // For security, don't reveal if email exists or not
      throw new Error('If the email exists, a reset link will be sent');
    }

    // Generate secure reset token
    const resetToken = token.generateSecureToken(32);
    const resetTokenExpiry = token.generateTokenExpiry(1); // 1 hour expiry

    // Update user with reset token
    await this.config.adapter.updateUser({
      id: user.id,
      resetToken,
      resetTokenExpiry,
    });

    // Return token (caller should send this via email)
    return {
      resetToken,
      user,
    };
  }

  /**
   * Verify a password reset token
   */
  public async verifyResetToken(resetToken: string): Promise<User> {
    if (!resetToken) {
      throw new Error('Reset token is required');
    }

    // Find user by reset token
    const user = await this.config.adapter.getUserByResetToken(resetToken);

    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    // Double-check token expiry (adapter should handle this, but be safe)
    if (user.resetTokenExpiry && token.isTokenExpired(user.resetTokenExpiry)) {
      throw new Error('Reset token has expired');
    }

    return user;
  }

  /**
   * Reset password using a valid reset token
   */
  public async resetPassword(resetToken: string, newPassword: string): Promise<{
    user: User;
    token: string;
  }> {
    if (!resetToken || !newPassword) {
      throw new Error('Reset token and new password are required');
    }

    // Verify token (this will throw if invalid)
    const user = await this.verifyResetToken(resetToken);

    // Hash new password
    const hashedPassword = await this.hashPassword(newPassword);

    // Update password in account
    const account = await this.config.adapter.getAccountByProvider({
      userId: user.id,
      provider: 'credentials',
    });

    if (!account) {
      throw new Error('No credentials account found for this user');
    }

    // Update the account with new password hash (stored in access_token)
    await this.config.adapter.updateAccount({
      id: account.id,
      access_token: hashedPassword,
    });

    // Clear reset token
    await this.config.adapter.updateUser({
      id: user.id,
      resetToken: null,
      resetTokenExpiry: null,
    });

    // Generate new JWT for automatic login
    let tokenPayload: JWT = {
      sub: user.id,
      email: user.email,
      name: user.name || undefined,
    };

    if (this.config.callbacks?.jwt) {
      tokenPayload = await this.config.callbacks.jwt({ token: tokenPayload, user });
    }

    const jwtToken = this.generateJwt(tokenPayload);

    return { user, token: jwtToken };
  }

  /**
   * Send verification email - generates a new verification token
   * Returns the token that should be sent to the user via email
   */
  public async sendVerificationEmail(email: string): Promise<{
    verificationToken: string;
    user: User;
  }> {
    if (!email) {
      throw new Error('Email is required');
    }

    const user = await this.config.adapter.getUserByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.emailVerified) {
      throw new Error('Email is already verified');
    }

    // Generate new verification token
    const verificationToken = token.generateSecureToken(32);
    const verificationTokenExpiry = token.generateTokenExpiry(24); // 24 hours

    // Update user with verification token
    await this.config.adapter.updateUser({
      id: user.id,
      verificationToken,
      verificationTokenExpiry,
    });

    return {
      verificationToken,
      user,
    };
  }

  /**
   * Verify email using verification token
   */
  public async verifyEmail(verificationToken: string): Promise<User> {
    if (!verificationToken) {
      throw new Error('Verification token is required');
    }

    // Find user by verification token
    const user = await this.config.adapter.getUserByVerificationToken(verificationToken);

    if (!user) {
      throw new Error('Invalid or expired verification token');
    }

    // Double-check token expiry
    if (user.verificationTokenExpiry && token.isTokenExpired(user.verificationTokenExpiry)) {
      throw new Error('Verification token has expired');
    }

    // Mark email as verified and clear token
    const verifiedUser = await this.config.adapter.updateUser({
      id: user.id,
      emailVerified: new Date(),
      verificationToken: null,
      verificationTokenExpiry: null,
    });

    return verifiedUser;
  }

  /**
   * Refresh access token using refresh token
   * @param refreshToken The refresh token
   * @returns New access token and optionally new refresh token
   */
  public async refreshAccessToken(refreshToken: string): Promise<{
    token: string;
    refreshToken?: string;
  }> {
    if (!refreshToken) {
      throw new Error('Refresh token is required');
    }

    // Check if refresh tokens are enabled
    if (!this.config.session?.refreshToken?.enabled) {
      throw new Error('Refresh tokens are not enabled');
    }

    // Get session by refresh token
    const session = await this.config.adapter.getSessionByRefreshToken(refreshToken);
    if (!session) {
      throw new Error('Invalid or expired refresh token');
    }

    // Get user
    const user = await this.config.adapter.getUser(session.userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Generate new access token
    let tokenPayload: JWT = {
      sub: user.id,
      email: user.email,
      name: user.name || undefined,
    };

    if (this.config.callbacks?.jwt) {
      tokenPayload = await this.config.callbacks.jwt({ token: tokenPayload, user });
    }

    const newAccessToken = this.generateJwt(tokenPayload);

    // Optionally rotate refresh token (generate new one)
    const shouldRotateRefreshToken = true; // Can be configurable
    let newRefreshToken: string | undefined;

    if (shouldRotateRefreshToken) {
      newRefreshToken = token.generateSecureToken(32);
      const refreshTokenMaxAge = this.config.session?.refreshToken?.maxAge || 30 * 24 * 60 * 60; // 30 days
      const refreshTokenExpires = new Date(Date.now() + refreshTokenMaxAge * 1000);

      // Update session with new refresh token
      await this.config.adapter.updateSession({
        sessionToken: session.sessionToken,
        refreshToken: newRefreshToken,
        refreshTokenExpires,
      });
    }

    return {
      token: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Sign out - invalidate a specific session
   * @param sessionToken The session token to invalidate
   */
  public async signOut(sessionToken: string): Promise<{ success: boolean }> {
    if (!sessionToken) {
      throw new Error('Session token is required');
    }

    // Delete the session
    const deletedSession = await this.config.adapter.deleteSession(sessionToken);

    if (!deletedSession) {
      throw new Error('Session not found');
    }

    // Call signOut event if defined
    if (this.config.events?.signOut) {
      // We need to get the JWT from the session token for the event
      // For now, we'll pass minimal info
      await this.config.events.signOut();
    }

    return { success: true };
  }

  /**
   * Sign out from all devices - invalidate all sessions for a user
   * @param userId The user ID
   */
  public async signOutAllDevices(userId: string): Promise<{ success: boolean; sessionsDeleted: number }> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Delete all sessions for the user
    const deletedCount = await this.config.adapter.deleteUserSessions(userId);

    return {
      success: true,
      sessionsDeleted: deletedCount,
    };
  }

  /**
   * Get session from JWT token
   * @param token JWT token string
   * @returns Session with user data or null if invalid
   */
  public async getSession(token: string): Promise<{
    user: User;
    expires: Date;
  } | null> {
    if (!token) {
      return null;
    }

    // Verify and decode JWT
    const decoded = await this.verifyJwt(token);
    if (!decoded || !decoded.sub) {
      return null;
    }

    // Get user from database
    const user = await this.config.adapter.getUser(decoded.sub);
    if (!user) {
      return null;
    }

    // Create session object
    let session: any = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        emailVerified: user.emailVerified,
      },
      expires: decoded.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + (this.config.session?.maxAge! * 1000)),
    };

    // Call session callback if defined
    if (this.config.callbacks?.session) {
      session = await this.config.callbacks.session({
        session,
        token: decoded,
      });
    }

    return session;
  }

  // --- Utility Methods ---

  public generateJwt(payload: JWT): string {
    const secret = this.config.secret;
    const maxAge = this.config.session?.maxAge!;
    const algorithm = this.config.jwt?.algorithm;
    const issuer = this.config.jwt?.issuer;
    const audience = this.config.jwt?.audience;

    return jwt.encode({
      token: payload,
      secret,
      maxAge,
      algorithm,
      issuer,
      audience,
    });
  }

  public async verifyJwt(token: string): Promise<JWT | null> {
    const secret = this.config.secret;
    const algorithms = this.config.jwt?.algorithm ? [this.config.jwt.algorithm] : (['HS256'] as jwt.JWTAlgorithm[]);
    const issuer = this.config.jwt?.issuer;
    const audience = this.config.jwt?.audience;

    return jwt.decode({
      token,
      secret,
      algorithms,
      issuer,
      audience,
    });
  }

  public hashPassword(plainTextPassword: string): Promise<string> {
    return password.hashPassword(plainTextPassword);
  }

  public comparePassword(plainTextPassword: string, hash: string): Promise<boolean> {
    return password.comparePassword(plainTextPassword, hash);
  }

  // --- OAuth Methods ---

  /**
   * Get authorization URL for OAuth provider
   * @param providerId The provider ID (e.g., 'google', 'github')
   * @returns Authorization URL with state parameter
   */
  public async getAuthorizationUrl(providerId: string): Promise<{
    url: string;
    state: string;
  }> {
    const provider = this.config.providers.find(p => p.id === providerId);

    if (!provider) {
      throw new Error(`Provider '${providerId}' not found`);
    }

    if (provider.type !== 'oauth') {
      throw new Error(`Provider '${providerId}' is not an OAuth provider`);
    }

    // Generate secure state token
    const state = token.generateSecureToken(32);

    // Get authorization URL from provider
    const url = await provider.getAuthorizationUrl({ state });

    return { url, state };
  }

  /**
   * Handle OAuth callback - exchange code for user profile and create/link account
   * @param providerId The provider ID
   * @param code Authorization code from provider
   * @param state State parameter for CSRF protection
   * @returns User and JWT token
   */
  public async handleOAuthCallback(
    providerId: string,
    code: string,
    expectedState?: string,
    receivedState?: string
  ): Promise<{
    user: User;
    token: string;
    isNewUser: boolean;
  }> {
    // Validate state for CSRF protection
    if (expectedState && receivedState !== expectedState) {
      throw new Error('Invalid state parameter - possible CSRF attack');
    }

    const provider = this.config.providers.find(p => p.id === providerId);

    if (!provider) {
      throw new Error(`Provider '${providerId}' not found`);
    }

    if (provider.type !== 'oauth') {
      throw new Error(`Provider '${providerId}' is not an OAuth provider`);
    }

    // Get user profile from provider
    const profile = await provider.getUserProfile(code);

    // Check if user exists by OAuth account
    let user = await this.config.adapter.getUserByAccount({
      provider: providerId,
      providerAccountId: profile.id,
    });

    let isNewUser = false;

    if (!user) {
      // Check if user exists by email
      user = await this.config.adapter.getUserByEmail(profile.email);

      if (!user) {
        // Create new user
        user = await this.config.adapter.createUser({
          email: profile.email,
          name: profile.name || null,
          emailVerified: new Date(), // OAuth providers verify emails
          image: profile.image || null,
        });

        isNewUser = true;

        // Call createUser event if defined
        if (this.config.events?.createUser) {
          await this.config.events.createUser({ user });
        }
      }

      // Link OAuth account to user
      const account: Omit<Account, 'id'> = {
        userId: user.id,
        type: 'oauth',
        provider: providerId,
        providerAccountId: profile.id,
        access_token: null,
        refresh_token: null,
        expires_at: null,
        token_type: null,
        scope: null,
        id_token: null,
        session_state: null,
      };

      await this.config.adapter.linkAccount(account as Account);

      // Call linkAccount event if defined
      if (this.config.events?.linkAccount) {
        await this.config.events.linkAccount({ user, account: account as Account });
      }
    }

    // Get the account for the signIn event
    const account = await this.config.adapter.getAccountByProvider({
      userId: user.id,
      provider: providerId,
    });

    // Call signIn event if defined
    if (this.config.events?.signIn) {
      await this.config.events.signIn({ user, account });
    }

    // Generate JWT token
    let tokenPayload: JWT = {
      sub: user.id,
      email: user.email,
      name: user.name || undefined,
    };

    // Call jwt callback if defined
    if (this.config.callbacks?.jwt) {
      tokenPayload = await this.config.callbacks.jwt({ token: tokenPayload, user });
    }

    const jwtToken = this.generateJwt(tokenPayload);

    return { user, token: jwtToken, isNewUser };
  }
}
