import { BaseAdapter, User, Account } from "@nexus-auth/core";

/**
 * SQL query executor function type
 * This function should execute raw SQL and return results
 */
export type QueryExecutor = <T = any>(sql: string, params?: any[]) => Promise<T[]>;

/**
 * Configuration options for the SQL adapter
 */
export interface SQLAdapterConfig {
  /**
   * Query executor function to run SQL queries
   * This function receives SQL string and parameters, and returns results
   *
   * @example
   * ```typescript
   * // PostgreSQL with pg
   * const query = async (sql, params) => {
   *   const result = await pool.query(sql, params);
   *   return result.rows;
   * };
   *
   * // MySQL with mysql2
   * const query = async (sql, params) => {
   *   const [rows] = await pool.execute(sql, params);
   *   return rows;
   * };
   * ```
   */
  query: QueryExecutor;

  /**
   * Database dialect for query generation
   * Default: 'postgres'
   */
  dialect?: 'postgres' | 'mysql' | 'sqlite' | 'mssql';

  /**
   * Optional table name mapping
   * Maps NexusAuth's expected table names to your database table names
   */
  tableNames?: {
    user?: string;
    account?: string;
    session?: string;
  };

  /**
   * Optional field mapping to work with existing database schemas
   * Maps NexusAuth's expected field names to your database column names
   */
  fieldMapping?: {
    user?: Record<string, string>;
    account?: Record<string, string>;
    session?: Record<string, string>;
  };
}

/**
 * Creates a Raw SQL adapter for NexusAuth
 *
 * This adapter provides maximum flexibility by allowing you to use raw SQL queries
 * with any SQL database. You provide a query executor function and the adapter
 * handles all the authentication logic.
 *
 * @param config - Configuration object containing query executor and mappings
 * @returns BaseAdapter implementation for Raw SQL
 *
 * @example
 * ```typescript
 * import { Pool } from 'pg';
 * import { SQLAdapter } from '@nexus-auth/sql-adapter';
 *
 * const pool = new Pool({ connectionString: process.env.DATABASE_URL });
 *
 * const adapter = SQLAdapter({
 *   query: async (sql, params) => {
 *     const result = await pool.query(sql, params);
 *     return result.rows;
 *   },
 *   dialect: 'postgres',
 * });
 * ```
 */
export function SQLAdapter(config: SQLAdapterConfig): BaseAdapter {
  const { query, dialect = 'postgres', tableNames = {}, fieldMapping = {} } = config;

  // Default table names
  const tables = {
    user: tableNames.user || 'users',
    account: tableNames.account || 'accounts',
    session: tableNames.session || 'sessions',
  };

  // Get parameter placeholder based on dialect
  const getPlaceholder = (index: number): string => {
    switch (dialect) {
      case 'postgres':
        return `$${index}`;
      case 'mysql':
      case 'sqlite':
        return '?';
      case 'mssql':
        return `@p${index}`;
      default:
        return '?';
    }
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

  // Helper to build INSERT query
  const buildInsert = (table: string, data: Record<string, any>): { sql: string; params: any[] } => {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => getPlaceholder(i + 1)).join(', ');

    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;
    return { sql, params: values };
  };

  // Helper to build UPDATE query
  const buildUpdate = (
    table: string,
    data: Record<string, any>,
    where: Record<string, any>
  ): { sql: string; params: any[] } => {
    const dataKeys = Object.keys(data);
    const whereKeys = Object.keys(where);

    const setClause = dataKeys.map((key, i) => `${key} = ${getPlaceholder(i + 1)}`).join(', ');
    const whereClause = whereKeys
      .map((key, i) => `${key} = ${getPlaceholder(dataKeys.length + i + 1)}`)
      .join(' AND ');

    const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause} RETURNING *`;
    const params = [...Object.values(data), ...Object.values(where)];

    return { sql, params };
  };

  return {
    async createUser(user: Omit<User, 'id'>) {
      const mappedUser = mapToDb(user, fieldMapping.user);
      const { sql, params } = buildInsert(tables.user, mappedUser);
      const [result] = await query(sql, params);
      return mapFromDb<User>(result, fieldMapping.user) as User;
    },

    async getUser(id: string) {
      const idField = fieldMapping.user?.id || 'id';
      const sql = `SELECT * FROM ${tables.user} WHERE ${idField} = ${getPlaceholder(1)}`;
      const [result] = await query(sql, [id]);
      return mapFromDb<User>(result, fieldMapping.user);
    },

    async getUserByEmail(email: string) {
      const emailField = fieldMapping.user?.email || 'email';
      const sql = `SELECT * FROM ${tables.user} WHERE ${emailField} = ${getPlaceholder(1)}`;
      const [result] = await query(sql, [email]);
      return mapFromDb<User>(result, fieldMapping.user);
    },

    async getUserByResetToken(resetToken: string) {
      const resetTokenField = fieldMapping.user?.resetToken || 'reset_token';
      const resetTokenExpiryField = fieldMapping.user?.resetTokenExpiry || 'reset_token_expiry';

      const sql = `SELECT * FROM ${tables.user} WHERE ${resetTokenField} = ${getPlaceholder(1)} AND ${resetTokenExpiryField} > ${getPlaceholder(2)}`;
      const [result] = await query(sql, [resetToken, new Date()]);
      return mapFromDb<User>(result, fieldMapping.user);
    },

    async getUserByVerificationToken(verificationToken: string) {
      const verificationTokenField = fieldMapping.user?.verificationToken || 'verification_token';
      const verificationTokenExpiryField = fieldMapping.user?.verificationTokenExpiry || 'verification_token_expiry';

      const sql = `SELECT * FROM ${tables.user} WHERE ${verificationTokenField} = ${getPlaceholder(1)} AND ${verificationTokenExpiryField} > ${getPlaceholder(2)}`;
      const [result] = await query(sql, [verificationToken, new Date()]);
      return mapFromDb<User>(result, fieldMapping.user);
    },

    async getUserByAccount(data: { provider: string; providerAccountId: string }) {
      const providerField = fieldMapping.account?.provider || 'provider';
      const providerAccountIdField = fieldMapping.account?.providerAccountId || 'provider_account_id';
      const userIdField = fieldMapping.account?.userId || 'user_id';
      const userTableIdField = fieldMapping.user?.id || 'id';

      const sql = `
        SELECT u.* FROM ${tables.user} u
        INNER JOIN ${tables.account} a ON u.${userTableIdField} = a.${userIdField}
        WHERE a.${providerField} = ${getPlaceholder(1)} AND a.${providerAccountIdField} = ${getPlaceholder(2)}
      `;
      const [result] = await query(sql, [data.provider, data.providerAccountId]);
      return mapFromDb<User>(result, fieldMapping.user);
    },

    async getAccountByProvider(data: { userId: string; provider: string }) {
      const userIdField = fieldMapping.account?.userId || 'user_id';
      const providerField = fieldMapping.account?.provider || 'provider';

      const sql = `SELECT * FROM ${tables.account} WHERE ${userIdField} = ${getPlaceholder(1)} AND ${providerField} = ${getPlaceholder(2)}`;
      const [result] = await query(sql, [data.userId, data.provider]);
      return mapFromDb<Account>(result, fieldMapping.account);
    },

    async updateUser(user: Partial<User> & { id: string }) {
      const { id, ...data } = user;
      const idField = fieldMapping.user?.id || 'id';
      const mappedData = mapToDb(data, fieldMapping.user);

      const { sql, params } = buildUpdate(tables.user, mappedData, { [idField]: id });
      const [result] = await query(sql, params);
      if (!result) throw new Error("User not found");
      return mapFromDb<User>(result, fieldMapping.user) as User;
    },

    async linkAccount(account: Account) {
      const mappedAccount = mapToDb(account, fieldMapping.account);
      const { sql, params } = buildInsert(tables.account, mappedAccount);
      const [result] = await query(sql, params);
      return mapFromDb<Account>(result, fieldMapping.account) as Account;
    },

    async updateAccount(account: Partial<Account> & { id: string }) {
      const { id, ...data } = account;
      const idField = fieldMapping.account?.id || 'id';
      const mappedData = mapToDb(data, fieldMapping.account);

      const { sql, params } = buildUpdate(tables.account, mappedData, { [idField]: id });
      const [result] = await query(sql, params);
      if (!result) throw new Error("Account not found");
      return mapFromDb<Account>(result, fieldMapping.account) as Account;
    },

    async deleteUser(userId: string) {
      const idField = fieldMapping.user?.id || 'id';
      const sql = `DELETE FROM ${tables.user} WHERE ${idField} = ${getPlaceholder(1)} RETURNING *`;
      const [result] = await query(sql, [userId]);
      return mapFromDb<User>(result, fieldMapping.user);
    },

    async unlinkAccount(data: { provider: string; providerAccountId: string }): Promise<Account | null> {
      const providerField = fieldMapping.account?.provider || 'provider';
      const providerAccountIdField = fieldMapping.account?.providerAccountId || 'provider_account_id';

      const sql = `DELETE FROM ${tables.account} WHERE ${providerField} = ${getPlaceholder(1)} AND ${providerAccountIdField} = ${getPlaceholder(2)} RETURNING *`;
      const [result] = await query(sql, [data.provider, data.providerAccountId]);
      return mapFromDb<Account>(result, fieldMapping.account);
    },

    async createSession(session: {
      sessionToken: string;
      userId: string;
      expires: Date;
      refreshToken?: string;
      refreshTokenExpires?: Date;
    }) {
      const mappedSession = mapToDb(session, fieldMapping.session);
      const { sql, params } = buildInsert(tables.session, mappedSession);
      const [result] = await query(sql, params);
      return mapFromDb(result, fieldMapping.session) as any;
    },

    async getSessionAndUser(sessionToken: string) {
      const sessionTokenField = fieldMapping.session?.sessionToken || 'session_token';
      const userIdField = fieldMapping.session?.userId || 'user_id';
      const userTableIdField = fieldMapping.user?.id || 'id';

      const sql = `
        SELECT s.*, u.* FROM ${tables.session} s
        INNER JOIN ${tables.user} u ON s.${userIdField} = u.${userTableIdField}
        WHERE s.${sessionTokenField} = ${getPlaceholder(1)}
      `;
      const [result] = await query(sql, [sessionToken]);
      if (!result) return null;

      // Split session and user data (assumes user fields are prefixed or can be separated)
      const user = mapFromDb<User>(result, fieldMapping.user);
      const sessionData = mapFromDb(result, fieldMapping.session);

      if (!user || !sessionData) return null;

      return {
        session: sessionData as any,
        user,
      };
    },

    async getSessionByRefreshToken(refreshToken: string) {
      const refreshTokenField = fieldMapping.session?.refreshToken || 'refresh_token';
      const refreshTokenExpiresField = fieldMapping.session?.refreshTokenExpires || 'refresh_token_expires';

      const sql = `SELECT * FROM ${tables.session} WHERE ${refreshTokenField} = ${getPlaceholder(1)} AND ${refreshTokenExpiresField} > ${getPlaceholder(2)}`;
      const [result] = await query(sql, [refreshToken, new Date()]);
      return mapFromDb(result, fieldMapping.session) as any;
    },

    async updateSession(session: Partial<{
      sessionToken: string;
      expires: Date;
      userId: string;
    }>) {
      if (!session.sessionToken) return null;

      const sessionTokenField = fieldMapping.session?.sessionToken || 'session_token';
      const { sessionToken, ...data } = session;
      const mappedData = mapToDb(data, fieldMapping.session);

      const { sql, params } = buildUpdate(tables.session, mappedData, { [sessionTokenField]: sessionToken });
      const [result] = await query(sql, params);
      return mapFromDb(result, fieldMapping.session) as any;
    },

    async deleteSession(sessionToken: string) {
      const sessionTokenField = fieldMapping.session?.sessionToken || 'session_token';
      const sql = `DELETE FROM ${tables.session} WHERE ${sessionTokenField} = ${getPlaceholder(1)} RETURNING *`;
      const [result] = await query(sql, [sessionToken]);
      return mapFromDb(result, fieldMapping.session) as any;
    },

    async deleteUserSessions(userId: string) {
      const userIdField = fieldMapping.session?.userId || 'user_id';
      const sql = `DELETE FROM ${tables.session} WHERE ${userIdField} = ${getPlaceholder(1)}`;
      const results = await query(sql, [userId]);
      return results.length || 0;
    },
  };
}
