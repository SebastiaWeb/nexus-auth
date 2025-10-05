import { BaseAdapter, User, Account } from "@nexus-auth/core";
import { DataSource, DataSourceOptions } from "typeorm";
import { AccountEntity, SessionEntity, UserEntity } from "./entities/index.js";

// Define the shape of the custom entities object
export interface CustomEntities {
  user?: typeof UserEntity;
  account?: typeof AccountEntity;
  session?: typeof SessionEntity;
}

// Define the adapter configuration
export type TypeORMAdapterConfig = DataSourceOptions & {
  entities?: CustomEntities;
};

export function TypeORMAdapter(
  config: TypeORMAdapterConfig | DataSource,
): BaseAdapter {
  
  const { entities: customEntities, ...dataSourceOptions } = config instanceof DataSource ? {} : config;

  const AppDataSource = config instanceof DataSource ? config : new DataSource(dataSourceOptions as DataSourceOptions);

  const entities = {
    user: customEntities?.user ?? UserEntity,
    account: customEntities?.account ?? AccountEntity,
    session: customEntities?.session ?? SessionEntity,
  };

  const getDataSource = async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    return AppDataSource;
  };

  return {
    async createUser(user: Omit<User, 'id'>) {
      const db = await getDataSource();
      const userRepo = db.getRepository(entities.user);
      const newUser = await userRepo.save(user);
      return newUser;
    },

    async getUser(id: string) {
      const db = await getDataSource();
      const userRepo = db.getRepository(entities.user);
      const user = await userRepo.findOneBy({ id });
      if (!user) return null;
      return user;
    },

    async getUserByEmail(email: string) {
      const db = await getDataSource();
      const userRepo = db.getRepository(entities.user);
      const user = await userRepo.findOneBy({ email });
      if (!user) return null;
      return user;
    },

    async getUserByResetToken(resetToken: string) {
      const db = await getDataSource();
      const userRepo = db.getRepository(entities.user);
      const user = await userRepo.findOneBy({ resetToken });
      if (!user) return null;

      // Check if token is expired
      if (user.resetTokenExpiry && new Date() > user.resetTokenExpiry) {
        return null; // Token expired
      }

      return user;
    },

    async getUserByVerificationToken(verificationToken: string) {
      const db = await getDataSource();
      const userRepo = db.getRepository(entities.user);
      const user = await userRepo.findOneBy({ verificationToken });
      if (!user) return null;

      // Check if token is expired
      if (user.verificationTokenExpiry && new Date() > user.verificationTokenExpiry) {
        return null; // Token expired
      }

      return user;
    },

    async getUserByAccount(data: { provider: string; providerAccountId: string; }) {
      const db = await getDataSource();
      const accountRepo = db.getRepository(entities.account);
      const account = await accountRepo.findOne({
        where: { provider: data.provider, providerAccountId: data.providerAccountId },
        relations: ['user']
      });
      return account?.user ?? null;
    },

    async getAccountByProvider(data: { userId: string; provider: string; }) {
      const db = await getDataSource();
      const accountRepo = db.getRepository(entities.account);
      const account = await accountRepo.findOne({
        where: { userId: data.userId, provider: data.provider }
      });
      return account ?? null;
    },

    async updateUser(user: Partial<User> & { id: string }) {
      const db = await getDataSource();
      const userRepo = db.getRepository(entities.user);
      await userRepo.save(user);
      const updatedUser = await userRepo.findOneBy({ id: user.id });
      if (!updatedUser) throw new Error("User not found after update");
      return updatedUser;
    },

    async linkAccount(account: Account) {
      const db = await getDataSource();
      const accountRepo = db.getRepository(entities.account);
      const newAccount = await accountRepo.save(account);
      return newAccount;
    },

    async updateAccount(account: Partial<Account> & { id: string }) {
      const db = await getDataSource();
      const accountRepo = db.getRepository(entities.account);
      await accountRepo.save(account);
      const updatedAccount = await accountRepo.findOneBy({ id: account.id });
      if (!updatedAccount) throw new Error("Account not found after update");
      return updatedAccount;
    },

    async deleteUser(userId: string) {
      const db = await getDataSource();
      const userRepo = db.getRepository(entities.user);
      const user = await userRepo.findOneBy({ id: userId });
      if (user) {
        await userRepo.delete(userId);
        return user;
      }
      return null;
    },

    async unlinkAccount(data: { provider: string; providerAccountId: string; }): Promise<Account | null> {
      const db = await getDataSource();
      const accountRepo = db.getRepository(entities.account);
      const account = await accountRepo.findOneBy({ provider: data.provider, providerAccountId: data.providerAccountId });
      if (account) {
        await accountRepo.delete({ id: account.id });
        return account;
      }
      return null;
    },

    async createSession(session: { sessionToken: string; userId: string; expires: Date; refreshToken?: string; refreshTokenExpires?: Date }) {
      const db = await getDataSource();
      const sessionRepo = db.getRepository(entities.session);
      const newSession = await sessionRepo.save(session);
      return newSession;
    },

    async getSessionAndUser(sessionToken: string) {
      const db = await getDataSource();
      const sessionRepo = db.getRepository(entities.session);
      const sessionAndUser = await sessionRepo.findOne({
        where: { sessionToken },
        relations: ['user']
      });
      if (!sessionAndUser) return null;
      const { user, ...sessionData } = sessionAndUser;
      return { session: sessionData, user };
    },

    async getSessionByRefreshToken(refreshToken: string) {
      const db = await getDataSource();
      const sessionRepo = db.getRepository(entities.session);
      const session = await sessionRepo.findOne({
        where: { refreshToken }
      });
      if (!session) return null;

      // Check if refresh token is expired
      if (session.refreshTokenExpires && new Date() > session.refreshTokenExpires) {
        return null; // Token expired
      }

      return session;
    },

    async updateSession(session: Partial<{ sessionToken: string; expires: Date; userId: string; }>) {
      const db = await getDataSource();
      const sessionRepo = db.getRepository(entities.session);
      if(!session.sessionToken) return null;
      await sessionRepo.update({ sessionToken: session.sessionToken }, session);
      const updatedSession = await sessionRepo.findOneBy({ sessionToken: session.sessionToken });
      if (!updatedSession) return null;
      return updatedSession;
    },

    async deleteSession(sessionToken: string) {
      const db = await getDataSource();
      const sessionRepo = db.getRepository(entities.session);
      const session = await sessionRepo.findOneBy({ sessionToken });
      if (session) {
        await sessionRepo.delete({ sessionToken });
        return session;
      }
      return null;
    },

    async deleteUserSessions(userId: string) {
      const db = await getDataSource();
      const sessionRepo = db.getRepository(entities.session);
      const result = await sessionRepo.delete({ userId });
      return result.affected || 0;
    },
  };
}