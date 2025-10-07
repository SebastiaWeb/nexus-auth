import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SQLAdapter } from './sql-adapter';

describe('SQLAdapter', () => {
  let mockExecutor: any;

  beforeEach(() => {
    mockExecutor = vi.fn().mockResolvedValue([]);
  });

  it('should create adapter with query executor', () => {
    const adapter = SQLAdapter({
      queryExecutor: mockExecutor,
      dialect: 'postgresql',
    });

    expect(adapter).toBeDefined();
    expect(adapter.createUser).toBeInstanceOf(Function);
    expect(adapter.getUser).toBeInstanceOf(Function);
    expect(adapter.getUserByEmail).toBeInstanceOf(Function);
  });

  it('should create adapter with field mapping', () => {
    const adapter = SQLAdapter({
      queryExecutor: mockExecutor,
      dialect: 'postgresql',
      fieldMapping: {
        user: {
          id: 'user_id',
          email: 'email_address',
        },
      },
    });

    expect(adapter).toBeDefined();
  });

  it('should create adapter with custom table names', () => {
    const adapter = SQLAdapter({
      queryExecutor: mockExecutor,
      dialect: 'mysql',
      tableNames: {
        user: 'users',
        account: 'accounts',
        session: 'sessions',
      },
    });

    expect(adapter).toBeDefined();
  });

  describe('Supported dialects', () => {
    const dialects = ['postgresql', 'mysql', 'sqlite', 'mssql'] as const;

    dialects.forEach((dialect) => {
      it(`should support ${dialect} dialect`, () => {
        expect(() => {
          SQLAdapter({
            queryExecutor: mockExecutor,
            dialect,
          });
        }).not.toThrow();
      });
    });
  });

  describe('Adapter methods', () => {
    it('should have all required methods', () => {
      const adapter = SQLAdapter({
        queryExecutor: mockExecutor,
        dialect: 'postgresql',
      });

      // User methods
      expect(adapter.createUser).toBeInstanceOf(Function);
      expect(adapter.getUser).toBeInstanceOf(Function);
      expect(adapter.getUserByEmail).toBeInstanceOf(Function);
      expect(adapter.getUserByResetToken).toBeInstanceOf(Function);
      expect(adapter.getUserByVerificationToken).toBeInstanceOf(Function);
      expect(adapter.getUserByAccount).toBeInstanceOf(Function);
      expect(adapter.updateUser).toBeInstanceOf(Function);
      expect(adapter.deleteUser).toBeInstanceOf(Function);

      // Account methods
      expect(adapter.linkAccount).toBeInstanceOf(Function);
      expect(adapter.getAccountByProvider).toBeInstanceOf(Function);
      expect(adapter.updateAccount).toBeInstanceOf(Function);
      expect(adapter.unlinkAccount).toBeInstanceOf(Function);

      // Session methods
      expect(adapter.createSession).toBeInstanceOf(Function);
      expect(adapter.getSessionAndUser).toBeInstanceOf(Function);
      expect(adapter.getSessionByRefreshToken).toBeInstanceOf(Function);
      expect(adapter.updateSession).toBeInstanceOf(Function);
      expect(adapter.deleteSession).toBeInstanceOf(Function);
      expect(adapter.deleteUserSessions).toBeInstanceOf(Function);
    });
  });

  describe('Configuration options', () => {
    it('should accept all configuration options', () => {
      expect(() => {
        SQLAdapter({
          queryExecutor: mockExecutor,
          dialect: 'postgresql',
          fieldMapping: {
            user: { id: 'user_id', email: 'user_email' },
            account: { provider: 'oauth_provider' },
            session: { sessionToken: 'session_token' },
          },
          tableNames: {
            user: 'app_users',
            account: 'oauth_accounts',
            session: 'user_sessions',
          },
        });
      }).not.toThrow();
    });
  });

  describe('Query executor', () => {
    it('should be a function', () => {
      const adapter = SQLAdapter({
        queryExecutor: mockExecutor,
        dialect: 'postgresql',
      });

      expect(mockExecutor).toBeInstanceOf(Function);
    });
  });
});
