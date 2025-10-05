import { BaseAdapter, User, Account } from "@nexusauth/core";
import type { Connection, Model, Schema } from "mongoose";

/**
 * Mongoose schema definitions for NexusAuth
 */
export interface MongooseSchemas {
  User?: Schema;
  Account?: Schema;
  Session?: Schema;
}

/**
 * Configuration options for the Mongoose adapter
 */
export interface MongooseAdapterConfig {
  /**
   * Mongoose connection instance
   */
  connection: Connection;

  /**
   * Optional custom schemas
   * If not provided, default schemas will be used
   */
  schemas?: MongooseSchemas;

  /**
   * Optional field mapping to work with existing database schemas
   * Maps NexusAuth's expected field names to your database field names
   */
  fieldMapping?: {
    user?: Record<string, string>;
    account?: Record<string, string>;
    session?: Record<string, string>;
  };

  /**
   * Optional collection name mapping
   * Maps NexusAuth's expected collection names to your database collection names
   */
  collectionNames?: {
    user?: string;
    account?: string;
    session?: string;
  };
}

/**
 * Default Mongoose schemas for NexusAuth
 */
function getDefaultSchemas(mongoose: any) {
  const { Schema } = mongoose;

  const UserSchema = new Schema({
    email: { type: String, required: true, unique: true },
    name: { type: String },
    password: { type: String },
    emailVerified: { type: Date },
    image: { type: String },
    resetToken: { type: String },
    resetTokenExpiry: { type: Date },
    verificationToken: { type: String },
    verificationTokenExpiry: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  });

  const AccountSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    provider: { type: String, required: true },
    providerAccountId: { type: String, required: true },
    accessToken: { type: String },
    refreshToken: { type: String },
    expiresAt: { type: Date },
    tokenType: { type: String },
    scope: { type: String },
    idToken: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  });

  AccountSchema.index({ provider: 1, providerAccountId: 1 }, { unique: true });

  const SessionSchema = new Schema({
    sessionToken: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    expires: { type: Date, required: true },
    refreshToken: { type: String, unique: true, sparse: true },
    refreshTokenExpires: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  });

  return {
    User: UserSchema,
    Account: AccountSchema,
    Session: SessionSchema,
  };
}

/**
 * Creates a Mongoose adapter for NexusAuth
 *
 * @param config - Configuration object containing Mongoose connection and optional mappings
 * @returns BaseAdapter implementation for Mongoose
 *
 * @example
 * ```typescript
 * import mongoose from 'mongoose';
 * import { MongooseAdapter } from '@nexusauth/mongoose-adapter';
 *
 * const connection = await mongoose.createConnection(process.env.MONGO_URL);
 *
 * const adapter = MongooseAdapter({
 *   connection,
 *   // Optional: Map to existing schema
 *   fieldMapping: {
 *     user: {
 *       id: '_id',
 *       email: 'emailAddress'
 *     }
 *   }
 * });
 * ```
 */
export function MongooseAdapter(config: MongooseAdapterConfig): BaseAdapter {
  const { connection, schemas, fieldMapping = {}, collectionNames = {} } = config;

  // Get mongoose from connection
  const mongoose = (connection as any).constructor;

  // Use custom schemas or default schemas
  const defaultSchemas = getDefaultSchemas(mongoose);
  const finalSchemas = {
    User: schemas?.User || defaultSchemas.User,
    Account: schemas?.Account || defaultSchemas.Account,
    Session: schemas?.Session || defaultSchemas.Session,
  };

  // Default collection names
  const collections = {
    user: collectionNames.user || 'users',
    account: collectionNames.account || 'accounts',
    session: collectionNames.session || 'sessions',
  };

  // Get or create models
  const UserModel: Model<any> = connection.models[collections.user] ||
    connection.model(collections.user, finalSchemas.User, collections.user);

  const AccountModel: Model<any> = connection.models[collections.account] ||
    connection.model(collections.account, finalSchemas.Account, collections.account);

  const SessionModel: Model<any> = connection.models[collections.session] ||
    connection.model(collections.session, finalSchemas.Session, collections.session);

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
    data: any | null,
    mapping?: Record<string, string>
  ): T | null => {
    if (!data) return null;

    const obj = data.toObject ? data.toObject() : data;

    if (!mapping) {
      // Always map _id to id for MongoDB
      const { _id, ...rest } = obj;
      return { id: _id?.toString(), ...rest } as T;
    }

    const mapped: Record<string, any> = {};
    const reverseMapping = Object.entries(mapping).reduce((acc, [key, dbKey]) => {
      acc[dbKey] = key;
      return acc;
    }, {} as Record<string, string>);

    for (const [dbKey, value] of Object.entries(obj)) {
      const nexusKey = reverseMapping[dbKey] || dbKey;
      // Convert MongoDB _id to string id
      if (dbKey === '_id') {
        mapped.id = value?.toString();
      } else {
        mapped[nexusKey] = value;
      }
    }
    return mapped as T;
  };

  return {
    async createUser(user: Omit<User, 'id'>) {
      const mappedUser = mapToDb(user, fieldMapping.user);
      const newUser = await UserModel.create(mappedUser);
      return mapFromDb<User>(newUser, fieldMapping.user) as User;
    },

    async getUser(id: string) {
      const user = await UserModel.findById(id);
      return mapFromDb<User>(user, fieldMapping.user);
    },

    async getUserByEmail(email: string) {
      const emailField = fieldMapping.user?.email || 'email';
      const user = await UserModel.findOne({ [emailField]: email });
      return mapFromDb<User>(user, fieldMapping.user);
    },

    async getUserByResetToken(resetToken: string) {
      const resetTokenField = fieldMapping.user?.resetToken || 'resetToken';
      const resetTokenExpiryField = fieldMapping.user?.resetTokenExpiry || 'resetTokenExpiry';

      const user = await UserModel.findOne({
        [resetTokenField]: resetToken,
        [resetTokenExpiryField]: { $gt: new Date() },
      });
      return mapFromDb<User>(user, fieldMapping.user);
    },

    async getUserByVerificationToken(verificationToken: string) {
      const verificationTokenField = fieldMapping.user?.verificationToken || 'verificationToken';
      const verificationTokenExpiryField = fieldMapping.user?.verificationTokenExpiry || 'verificationTokenExpiry';

      const user = await UserModel.findOne({
        [verificationTokenField]: verificationToken,
        [verificationTokenExpiryField]: { $gt: new Date() },
      });
      return mapFromDb<User>(user, fieldMapping.user);
    },

    async getUserByAccount(data: { provider: string; providerAccountId: string }) {
      const providerField = fieldMapping.account?.provider || 'provider';
      const providerAccountIdField = fieldMapping.account?.providerAccountId || 'providerAccountId';

      const account = await AccountModel.findOne({
        [providerField]: data.provider,
        [providerAccountIdField]: data.providerAccountId,
      }).populate('userId');

      if (!account || !account.userId) return null;
      return mapFromDb<User>(account.userId, fieldMapping.user);
    },

    async getAccountByProvider(data: { userId: string; provider: string }) {
      const userIdField = fieldMapping.account?.userId || 'userId';
      const providerField = fieldMapping.account?.provider || 'provider';

      const account = await AccountModel.findOne({
        [userIdField]: data.userId,
        [providerField]: data.provider,
      });
      return mapFromDb<Account>(account, fieldMapping.account);
    },

    async updateUser(user: Partial<User> & { id: string }) {
      const { id, ...data } = user;
      const mappedData = mapToDb(data, fieldMapping.user);

      const updatedUser = await UserModel.findByIdAndUpdate(
        id,
        { ...mappedData, updatedAt: new Date() },
        { new: true }
      );
      if (!updatedUser) throw new Error("User not found");
      return mapFromDb<User>(updatedUser, fieldMapping.user) as User;
    },

    async linkAccount(account: Account) {
      const mappedAccount = mapToDb(account, fieldMapping.account);
      const newAccount = await AccountModel.create(mappedAccount);
      return mapFromDb<Account>(newAccount, fieldMapping.account) as Account;
    },

    async updateAccount(account: Partial<Account> & { id: string }) {
      const { id, ...data } = account;
      const mappedData = mapToDb(data, fieldMapping.account);

      const updatedAccount = await AccountModel.findByIdAndUpdate(
        id,
        { ...mappedData, updatedAt: new Date() },
        { new: true }
      );
      if (!updatedAccount) throw new Error("Account not found");
      return mapFromDb<Account>(updatedAccount, fieldMapping.account) as Account;
    },

    async deleteUser(userId: string) {
      const deletedUser = await UserModel.findByIdAndDelete(userId);
      return mapFromDb<User>(deletedUser, fieldMapping.user);
    },

    async unlinkAccount(data: { provider: string; providerAccountId: string }): Promise<Account | null> {
      const providerField = fieldMapping.account?.provider || 'provider';
      const providerAccountIdField = fieldMapping.account?.providerAccountId || 'providerAccountId';

      const deletedAccount = await AccountModel.findOneAndDelete({
        [providerField]: data.provider,
        [providerAccountIdField]: data.providerAccountId,
      });
      return mapFromDb<Account>(deletedAccount, fieldMapping.account);
    },

    async createSession(session: {
      sessionToken: string;
      userId: string;
      expires: Date;
      refreshToken?: string;
      refreshTokenExpires?: Date;
    }) {
      const mappedSession = mapToDb(session, fieldMapping.session);
      const newSession = await SessionModel.create(mappedSession);
      return mapFromDb(newSession, fieldMapping.session) as any;
    },

    async getSessionAndUser(sessionToken: string) {
      const sessionTokenField = fieldMapping.session?.sessionToken || 'sessionToken';

      const session = await SessionModel.findOne({
        [sessionTokenField]: sessionToken,
      }).populate('userId');

      if (!session || !session.userId) return null;

      const user = mapFromDb<User>(session.userId, fieldMapping.user);
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

      const session = await SessionModel.findOne({
        [refreshTokenField]: refreshToken,
        [refreshTokenExpiresField]: { $gt: new Date() },
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

      const updatedSession = await SessionModel.findOneAndUpdate(
        { [sessionTokenField]: sessionToken },
        { ...mappedData, updatedAt: new Date() },
        { new: true }
      );
      return mapFromDb(updatedSession, fieldMapping.session) as any;
    },

    async deleteSession(sessionToken: string) {
      const sessionTokenField = fieldMapping.session?.sessionToken || 'sessionToken';

      const deletedSession = await SessionModel.findOneAndDelete({
        [sessionTokenField]: sessionToken,
      });
      return mapFromDb(deletedSession, fieldMapping.session) as any;
    },

    async deleteUserSessions(userId: string) {
      const userIdField = fieldMapping.session?.userId || 'userId';

      const result = await SessionModel.deleteMany({
        [userIdField]: userId,
      });
      return result.deletedCount || 0;
    },
  };
}
