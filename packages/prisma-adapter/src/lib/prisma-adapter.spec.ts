import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrismaAdapter } from './prisma-adapter';

describe('PrismaAdapter', () => {
  let mockPrismaClient: any;

  beforeEach(() => {
    mockPrismaClient = {
      user: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      account: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      session: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
      },
    };
  });

  it('should create adapter with default configuration', () => {
    const adapter = PrismaAdapter({ client: mockPrismaClient });
    expect(adapter).toBeDefined();
    expect(adapter.createUser).toBeInstanceOf(Function);
    expect(adapter.getUser).toBeInstanceOf(Function);
    expect(adapter.getUserByEmail).toBeInstanceOf(Function);
  });

  it('should create adapter with field mapping', () => {
    const adapter = PrismaAdapter({
      client: mockPrismaClient,
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
    const adapter = PrismaAdapter({
      client: mockPrismaClient,
      tableNames: {
        user: 'users',
        account: 'accounts',
        session: 'sessions',
      },
    });
    expect(adapter).toBeDefined();
  });

  describe('User operations', () => {
    it('should create user', async () => {
      const adapter = PrismaAdapter({ client: mockPrismaClient });
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: null,
        password: 'hashedpassword',
        image: null,
        createdAt: new Date(),
      };

      mockPrismaClient.user.create.mockResolvedValue(mockUser);

      const result = await adapter.createUser({
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedpassword',
      });

      expect(result).toEqual(mockUser);
      expect(mockPrismaClient.user.create).toHaveBeenCalled();
    });

    it('should get user by id', async () => {
      const adapter = PrismaAdapter({ client: mockPrismaClient });
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
      };

      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);

      const result = await adapter.getUser('1');

      expect(result).toEqual(mockUser);
      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should get user by email', async () => {
      const adapter = PrismaAdapter({ client: mockPrismaClient });
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
      };

      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);

      const result = await adapter.getUserByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should update user', async () => {
      const adapter = PrismaAdapter({ client: mockPrismaClient });
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Updated User',
      };

      mockPrismaClient.user.update.mockResolvedValue(mockUser);

      const result = await adapter.updateUser({
        id: '1',
        name: 'Updated User',
      });

      expect(result).toEqual(mockUser);
      expect(mockPrismaClient.user.update).toHaveBeenCalled();
    });
  });

  describe('Account operations', () => {
    it('should link account', async () => {
      const adapter = PrismaAdapter({ client: mockPrismaClient });
      const mockAccount = {
        id: '1',
        userId: 'user1',
        provider: 'google',
        providerAccountId: 'google123',
      };

      mockPrismaClient.account.create.mockResolvedValue(mockAccount);

      const result = await adapter.linkAccount({
        userId: 'user1',
        provider: 'google',
        providerAccountId: 'google123',
      } as any);

      expect(result).toEqual(mockAccount);
      expect(mockPrismaClient.account.create).toHaveBeenCalled();
    });

    it('should get account by provider', async () => {
      const adapter = PrismaAdapter({ client: mockPrismaClient });
      const mockAccount = {
        id: '1',
        userId: 'user1',
        provider: 'google',
        providerAccountId: 'google123',
      };

      mockPrismaClient.account.findFirst.mockResolvedValue(mockAccount);

      const result = await adapter.getAccountByProvider({
        userId: 'user1',
        provider: 'google',
      });

      expect(result).toEqual(mockAccount);
      expect(mockPrismaClient.account.findFirst).toHaveBeenCalled();
    });
  });

  describe('Session operations', () => {
    it('should create session', async () => {
      const adapter = PrismaAdapter({ client: mockPrismaClient });
      const mockSession = {
        id: '1',
        sessionToken: 'token123',
        userId: 'user1',
        expires: new Date(),
      };

      mockPrismaClient.session.create.mockResolvedValue(mockSession);

      const result = await adapter.createSession({
        sessionToken: 'token123',
        userId: 'user1',
        expires: new Date(),
      });

      expect(result).toBeDefined();
      expect(mockPrismaClient.session.create).toHaveBeenCalled();
    });

    it('should delete session', async () => {
      const adapter = PrismaAdapter({ client: mockPrismaClient });
      const mockSession = {
        id: '1',
        sessionToken: 'token123',
      };

      mockPrismaClient.session.delete.mockResolvedValue(mockSession);

      const result = await adapter.deleteSession('token123');

      expect(result).toBeDefined();
      expect(mockPrismaClient.session.delete).toHaveBeenCalledWith({
        where: { sessionToken: 'token123' },
      });
    });

    it('should delete user sessions', async () => {
      const adapter = PrismaAdapter({ client: mockPrismaClient });

      mockPrismaClient.session.deleteMany.mockResolvedValue({ count: 3 });

      const result = await adapter.deleteUserSessions('user1');

      expect(result).toBe(3);
      expect(mockPrismaClient.session.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user1' },
      });
    });
  });

  describe('Field mapping', () => {
    it('should map custom field names correctly', async () => {
      const adapter = PrismaAdapter({
        client: mockPrismaClient,
        fieldMapping: {
          user: {
            id: 'user_id',
            email: 'email_address',
          },
        },
      });

      const mockUser = {
        user_id: '1',
        email_address: 'test@example.com',
      };

      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);

      const result = await adapter.getUserByEmail('test@example.com');

      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { email_address: 'test@example.com' },
      });
    });
  });
});
