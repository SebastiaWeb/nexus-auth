import { BaseAdapter, User, Account } from "@nexusauth/core";

/**
 * Configuration options for the Prisma adapter
 */
export interface PrismaAdapterConfig {
  /**
   * An instance of PrismaClient
   */
  client: any; // PrismaClient type from @prisma/client (peerDependency)

  /**
   * Optional field mapping to work with existing database schemas
   * Maps NexusAuth's expected field names to your database column names
   */
  fieldMapping?: {
    user?: {
      id?: string;
      email?: string;
      name?: string;
      emailVerified?: string;
      password?: string;
      image?: string;
      resetToken?: string;
      resetTokenExpiry?: string;
      verificationToken?: string;
      verificationTokenExpiry?: string;
      createdAt?: string;
      updatedAt?: string;
    };
    account?: {
      id?: string;
      userId?: string;
      provider?: string;
      providerAccountId?: string;
      accessToken?: string;
      refreshToken?: string;
      expiresAt?: string;
      tokenType?: string;
      scope?: string;
      idToken?: string;
      createdAt?: string;
      updatedAt?: string;
    };
    session?: {
      id?: string;
      sessionToken?: string;
      userId?: string;
      expires?: string;
      refreshToken?: string;
      refreshTokenExpires?: string;
      createdAt?: string;
      updatedAt?: string;
    };
  };

  /**
   * Optional table name mapping
   * Maps NexusAuth's expected table names to your database table names
   */
  tableNames?: {
    user?: string;
    account?: string;
    session?: string;
  };
}

/**
 * Creates a Prisma adapter for NexusAuth
 *
 * @param config - Configuration object containing PrismaClient instance and optional mappings
 * @returns BaseAdapter implementation for Prisma
 *
 * @example
 * ```typescript
 * import { PrismaClient } from '@prisma/client';
 * import { PrismaAdapter } from '@nexusauth/prisma-adapter';
 *
 * const prisma = new PrismaClient();
 *
 * const adapter = PrismaAdapter({
 *   client: prisma,
 *   // Optional: Map to existing schema
 *   fieldMapping: {
 *     user: {
 *       id: 'user_id',
 *       email: 'email_address'
 *     }
 *   }
 * });
 * ```
 */
export function PrismaAdapter(config: PrismaAdapterConfig): BaseAdapter {
  const { client, fieldMapping = {}, tableNames = {} } = config;

  // Default table names
  const tables = {
    user: tableNames.user || 'user',
    account: tableNames.account || 'account',
    session: tableNames.session || 'session',
  };

  // Helper to map fields from NexusAuth format to database format
  const mapToDb = <T extends Record<string, any>>(
    data: T,
    mapping?: Record<string, string>
  ): Record<string, any> => {
    if (!mapping) return data;

    const mapped: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      const dbKey = mapping[key] || key;
      mapped[dbKey] = value;
    }
    return mapped;
  };

  // Helper to map fields from database format to NexusAuth format
  const mapFromDb = <T>(
    data: Record<string, any> | null,
    mapping?: Record<string, string>
  ): T | null => {
    if (!data || !mapping) return data as T | null;

    const mapped: Record<string, any> = {};
    const reverseMapping = Object.entries(mapping).reduce((acc, [key, dbKey]) => {
      acc[dbKey] = key;
      return acc;
    }, {} as Record<string, string>);

    for (const [dbKey, value] of Object.entries(data)) {
      const nexusKey = reverseMapping[dbKey] || dbKey;
      mapped[nexusKey] = value;
    }
    return mapped as T;
  };

  return {
    async createUser(user: Omit<User, 'id'>) {
      const mappedUser = mapToDb(user, fieldMapping.user);
      const newUser = await (client as any)[tables.user].create({
        data: mappedUser,
      });
      return mapFromDb<User>(newUser, fieldMapping.user) as User;
    },

    async getUser(id: string) {
      const idField = fieldMapping.user?.id || 'id';
      const user = await (client as any)[tables.user].findUnique({
        where: { [idField]: id },
      });
      return mapFromDb<User>(user, fieldMapping.user);
    },

    async getUserByEmail(email: string) {
      const emailField = fieldMapping.user?.email || 'email';
      const user = await (client as any)[tables.user].findUnique({
        where: { [emailField]: email },
      });
      return mapFromDb<User>(user, fieldMapping.user);
    },

    async getUserByResetToken(resetToken: string) {
      const resetTokenField = fieldMapping.user?.resetToken || 'resetToken';
      const resetTokenExpiryField = fieldMapping.user?.resetTokenExpiry || 'resetTokenExpiry';

      const user = await (client as any)[tables.user].findFirst({
        where: {
          [resetTokenField]: resetToken,
          [resetTokenExpiryField]: {
            gt: new Date(),
          },
        },
      });
      return mapFromDb<User>(user, fieldMapping.user);
    },

    async getUserByVerificationToken(verificationToken: string) {
      const verificationTokenField = fieldMapping.user?.verificationToken || 'verificationToken';
      const verificationTokenExpiryField = fieldMapping.user?.verificationTokenExpiry || 'verificationTokenExpiry';

      const user = await (client as any)[tables.user].findFirst({
        where: {
          [verificationTokenField]: verificationToken,
          [verificationTokenExpiryField]: {
            gt: new Date(),
          },
        },
      });
      return mapFromDb<User>(user, fieldMapping.user);
    },

    async getUserByAccount(data: { provider: string; providerAccountId: string }) {
      const providerField = fieldMapping.account?.provider || 'provider';
      const providerAccountIdField = fieldMapping.account?.providerAccountId || 'providerAccountId';

      const account = await (client as any)[tables.account].findUnique({
        where: {
          [`${providerField}_${providerAccountIdField}`]: {
            [providerField]: data.provider,
            [providerAccountIdField]: data.providerAccountId,
          },
        },
        include: {
          [tables.user]: true,
        },
      });

      if (!account) return null;
      return mapFromDb<User>(account[tables.user], fieldMapping.user);
    },

    async getAccountByProvider(data: { userId: string; provider: string }) {
      const userIdField = fieldMapping.account?.userId || 'userId';
      const providerField = fieldMapping.account?.provider || 'provider';

      const account = await (client as any)[tables.account].findFirst({
        where: {
          [userIdField]: data.userId,
          [providerField]: data.provider,
        },
      });
      return mapFromDb<Account>(account, fieldMapping.account);
    },

    async updateUser(user: Partial<User> & { id: string }) {
      const { id, ...data } = user;
      const idField = fieldMapping.user?.id || 'id';
      const mappedData = mapToDb(data, fieldMapping.user);

      const updatedUser = await (client as any)[tables.user].update({
        where: { [idField]: id },
        data: mappedData,
      });
      return mapFromDb<User>(updatedUser, fieldMapping.user) as User;
    },

    async linkAccount(account: Account) {
      const mappedAccount = mapToDb(account, fieldMapping.account);
      const newAccount = await (client as any)[tables.account].create({
        data: mappedAccount,
      });
      return mapFromDb<Account>(newAccount, fieldMapping.account) as Account;
    },

    async updateAccount(account: Partial<Account> & { id: string }) {
      const { id, ...data } = account;
      const idField = fieldMapping.account?.id || 'id';
      const mappedData = mapToDb(data, fieldMapping.account);

      const updatedAccount = await (client as any)[tables.account].update({
        where: { [idField]: id },
        data: mappedData,
      });
      return mapFromDb<Account>(updatedAccount, fieldMapping.account) as Account;
    },

    async deleteUser(userId: string) {
      const idField = fieldMapping.user?.id || 'id';
      try {
        const deletedUser = await (client as any)[tables.user].delete({
          where: { [idField]: userId },
        });
        return mapFromDb<User>(deletedUser, fieldMapping.user);
      } catch (error) {
        return null;
      }
    },

    async unlinkAccount(data: { provider: string; providerAccountId: string }): Promise<Account | null> {
      const providerField = fieldMapping.account?.provider || 'provider';
      const providerAccountIdField = fieldMapping.account?.providerAccountId || 'providerAccountId';

      try {
        const deletedAccount = await (client as any)[tables.account].delete({
          where: {
            [`${providerField}_${providerAccountIdField}`]: {
              [providerField]: data.provider,
              [providerAccountIdField]: data.providerAccountId,
            },
          },
        });
        return mapFromDb<Account>(deletedAccount, fieldMapping.account);
      } catch (error) {
        return null;
      }
    },

    async createSession(session: {
      sessionToken: string;
      userId: string;
      expires: Date;
      refreshToken?: string;
      refreshTokenExpires?: Date;
    }) {
      const mappedSession = mapToDb(session, fieldMapping.session);
      const newSession = await (client as any)[tables.session].create({
        data: mappedSession,
      });
      return mapFromDb(newSession, fieldMapping.session) as any;
    },

    async getSessionAndUser(sessionToken: string) {
      const sessionTokenField = fieldMapping.session?.sessionToken || 'sessionToken';

      const session = await (client as any)[tables.session].findUnique({
        where: { [sessionTokenField]: sessionToken },
        include: {
          [tables.user]: true,
        },
      });

      if (!session) return null;

      const user = mapFromDb<User>(session[tables.user], fieldMapping.user);
      const sessionData = mapFromDb(session, fieldMapping.session);

      if (!user || !sessionData) return null;

      return {
        session: sessionData as any,
        user,
      };
    },

    async getSessionByRefreshToken(refreshToken: string) {
      const refreshTokenField = fieldMapping.session?.refreshToken || 'refreshToken';
      const refreshTokenExpiresField = fieldMapping.session?.refreshTokenExpires || 'refreshTokenExpires';

      const session = await (client as any)[tables.session].findFirst({
        where: {
          [refreshTokenField]: refreshToken,
          [refreshTokenExpiresField]: {
            gt: new Date(),
          },
        },
      });
      return mapFromDb(session, fieldMapping.session) as any;
    },

    async updateSession(session: Partial<{
      sessionToken: string;
      expires: Date;
      userId: string;
    }>) {
      if (!session.sessionToken) return null;

      const sessionTokenField = fieldMapping.session?.sessionToken || 'sessionToken';
      const { sessionToken, ...data } = session;
      const mappedData = mapToDb(data, fieldMapping.session);

      try {
        const updatedSession = await (client as any)[tables.session].update({
          where: { [sessionTokenField]: sessionToken },
          data: mappedData,
        });
        return mapFromDb(updatedSession, fieldMapping.session) as any;
      } catch (error) {
        return null;
      }
    },

    async deleteSession(sessionToken: string) {
      const sessionTokenField = fieldMapping.session?.sessionToken || 'sessionToken';

      try {
        const deletedSession = await (client as any)[tables.session].delete({
          where: { [sessionTokenField]: sessionToken },
        });
        return mapFromDb(deletedSession, fieldMapping.session) as any;
      } catch (error) {
        return null;
      }
    },

    async deleteUserSessions(userId: string) {
      const userIdField = fieldMapping.session?.userId || 'userId';

      const result = await (client as any)[tables.session].deleteMany({
        where: { [userIdField]: userId },
      });
      return result.count || 0;
    },
  };
}
