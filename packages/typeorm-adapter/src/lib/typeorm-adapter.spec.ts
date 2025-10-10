import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TypeORMAdapter } from './typeorm-adapter';

describe('TypeORMAdapter', () => {
  let mockDataSource: any;
  let mockUserRepo: any;
  let mockAccountRepo: any;
  let mockSessionRepo: any;

  beforeEach(() => {
    mockUserRepo = {
      save: vi.fn(),
      findOneBy: vi.fn(),
      findOne: vi.fn(),
      delete: vi.fn(),
    };

    mockAccountRepo = {
      save: vi.fn(),
      findOne: vi.fn(),
      findOneBy: vi.fn(),
      delete: vi.fn(),
    };

    mockSessionRepo = {
      save: vi.fn(),
      findOne: vi.fn(),
      findOneBy: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    };

    mockDataSource = {
      isInitialized: true,
      initialize: vi.fn().mockResolvedValue(undefined),
      getRepository: vi.fn((entity: any) => {
        // Return appropriate mock based on entity name
        const entityName = entity?.name || '';
        if (entityName.includes('User')) return mockUserRepo;
        if (entityName.includes('Account')) return mockAccountRepo;
        if (entityName.includes('Session')) return mockSessionRepo;
        return mockUserRepo; // default
      }),
    };
  });

  it('should create adapter functions with existing DataSource instance', () => {
    const adapter = TypeORMAdapter(mockDataSource as any);

    expect(adapter).toBeDefined();
    expect(adapter.createUser).toBeInstanceOf(Function);
    expect(adapter.getUser).toBeInstanceOf(Function);
    expect(adapter.getUserByEmail).toBeInstanceOf(Function);
    expect(adapter.createSession).toBeInstanceOf(Function);
  });

  it('should create user', async () => {
    const adapter = TypeORMAdapter(mockDataSource as any);
    const userData = {
      email: 'test@example.com',
      name: 'Test User',
    };

    const savedUser = { id: '123', ...userData };
    mockUserRepo.save.mockResolvedValue(savedUser);

    const result = await adapter.createUser(userData);

    expect(mockUserRepo.save).toHaveBeenCalledWith(userData);
    expect(result).toEqual(savedUser);
  });

  it('should get user by id', async () => {
    const adapter = TypeORMAdapter(mockDataSource as any);
    const user = { id: '123', email: 'test@example.com' };

    mockUserRepo.findOneBy.mockResolvedValue(user);

    const result = await adapter.getUser('123');

    expect(mockUserRepo.findOneBy).toHaveBeenCalledWith({ id: '123' });
    expect(result).toEqual(user);
  });

  it('should return null when user not found', async () => {
    const adapter = TypeORMAdapter(mockDataSource as any);

    mockUserRepo.findOneBy.mockResolvedValue(null);

    const result = await adapter.getUser('123');

    expect(result).toBeNull();
  });

  it('should get user by email', async () => {
    const adapter = TypeORMAdapter(mockDataSource as any);
    const user = { id: '123', email: 'test@example.com' };

    mockUserRepo.findOneBy.mockResolvedValue(user);

    const result = await adapter.getUserByEmail('test@example.com');

    expect(mockUserRepo.findOneBy).toHaveBeenCalledWith({ email: 'test@example.com' });
    expect(result).toEqual(user);
  });

  it('should get user by reset token', async () => {
    const adapter = TypeORMAdapter(mockDataSource as any);
    const user = {
      id: '123',
      email: 'test@example.com',
      resetToken: 'token123',
      resetTokenExpiry: new Date(Date.now() + 3600000), // 1 hour from now
    };

    mockUserRepo.findOneBy.mockResolvedValue(user);

    const result = await adapter.getUserByResetToken('token123');

    expect(result).toEqual(user);
  });

  it('should return null for expired reset token', async () => {
    const adapter = TypeORMAdapter(mockDataSource as any);
    const user = {
      id: '123',
      email: 'test@example.com',
      resetToken: 'token123',
      resetTokenExpiry: new Date(Date.now() - 3600000), // 1 hour ago (expired)
    };

    mockUserRepo.findOneBy.mockResolvedValue(user);

    const result = await adapter.getUserByResetToken('token123');

    expect(result).toBeNull();
  });

  it('should update user', async () => {
    const adapter = TypeORMAdapter(mockDataSource as any);
    const updatedUser = { id: '123', email: 'updated@example.com', name: 'Updated' };

    mockUserRepo.save.mockResolvedValue(updatedUser);
    mockUserRepo.findOneBy.mockResolvedValue(updatedUser);

    const result = await adapter.updateUser(updatedUser);

    expect(mockUserRepo.save).toHaveBeenCalledWith(updatedUser);
    expect(result).toEqual(updatedUser);
  });

  it('should delete user', async () => {
    const adapter = TypeORMAdapter(mockDataSource as any);
    const user = { id: '123', email: 'test@example.com' };

    mockUserRepo.findOneBy.mockResolvedValue(user);
    mockUserRepo.delete.mockResolvedValue({ affected: 1 });

    const result = await adapter.deleteUser('123');

    expect(mockUserRepo.delete).toHaveBeenCalledWith('123');
    expect(result).toEqual(user);
  });

  it('should link account', async () => {
    const adapter = TypeORMAdapter(mockDataSource as any);
    const account = {
      userId: '123',
      provider: 'google',
      providerAccountId: 'google123',
      accessToken: 'token',
    };

    mockAccountRepo.save.mockResolvedValue({ id: 'acc1', ...account });

    const result = await adapter.linkAccount(account as any);

    expect(mockAccountRepo.save).toHaveBeenCalledWith(account);
    expect(result.userId).toEqual('123');
  });

  it('should create session', async () => {
    const adapter = TypeORMAdapter(mockDataSource as any);
    const session = {
      sessionToken: 'session123',
      userId: '123',
      expires: new Date(),
    };

    mockSessionRepo.save.mockResolvedValue(session);

    const result = await adapter.createSession(session);

    expect(mockSessionRepo.save).toHaveBeenCalledWith(session);
    expect(result).toEqual(session);
  });

  it('should get session and user', async () => {
    const adapter = TypeORMAdapter(mockDataSource as any);
    const user = { id: '123', email: 'test@example.com' };
    const sessionData = {
      sessionToken: 'session123',
      userId: '123',
      expires: new Date(),
      user,
    };

    mockSessionRepo.findOne.mockResolvedValue(sessionData);

    const result = await adapter.getSessionAndUser('session123');

    expect(result).toBeDefined();
    expect(result?.user).toEqual(user);
    expect(result?.session.sessionToken).toEqual('session123');
  });

  it('should delete session', async () => {
    const adapter = TypeORMAdapter(mockDataSource as any);
    const session = { sessionToken: 'session123', userId: '123' };

    mockSessionRepo.findOneBy.mockResolvedValue(session);
    mockSessionRepo.delete.mockResolvedValue({ affected: 1 });

    const result = await adapter.deleteSession('session123');

    expect(result).toEqual(session);
  });

  it('should delete all user sessions', async () => {
    const adapter = TypeORMAdapter(mockDataSource as any);

    mockSessionRepo.delete.mockResolvedValue({ affected: 3 });

    const result = await adapter.deleteUserSessions('123');

    expect(mockSessionRepo.delete).toHaveBeenCalledWith({ userId: '123' });
    expect(result).toEqual(3);
  });

  it('should initialize DataSource if not initialized', async () => {
    mockDataSource.isInitialized = false;
    const adapter = TypeORMAdapter(mockDataSource as any);

    mockUserRepo.findOneBy.mockResolvedValue({ id: '123' });

    await adapter.getUser('123');

    expect(mockDataSource.initialize).toHaveBeenCalled();
  });
});
