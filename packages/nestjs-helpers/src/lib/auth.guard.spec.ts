import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NexusAuthGuard, IS_PUBLIC_KEY } from './auth.guard';
import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

describe('NexusAuthGuard', () => {
  let guard: NexusAuthGuard;
  let mockNexusAuth: any;
  let mockReflector: any;
  let mockContext: any;
  let mockRequest: any;

  beforeEach(() => {
    mockNexusAuth = {
      adapter: {
        getSessionAndUser: vi.fn(),
        deleteSession: vi.fn(),
      },
    };

    mockReflector = {
      getAllAndOverride: vi.fn(),
    } as any;

    mockRequest = {
      cookies: {},
      user: undefined,
      session: undefined,
    };

    mockContext = {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: () => mockRequest,
      }),
    } as any;

    guard = new NexusAuthGuard(mockNexusAuth, mockReflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access to public routes', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(true);

    const result = await guard.canActivate(mockContext);

    expect(result).toBe(true);
    expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
      mockContext.getHandler(),
      mockContext.getClass(),
    ]);
  });

  it('should throw UnauthorizedException when no session token', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);

    await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(mockContext)).rejects.toThrow('No session token found');
  });

  it('should allow access with valid session', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    mockRequest.cookies['nexus.session-token'] = 'valid-token';

    const user = { id: '123', email: 'test@example.com' };
    const session = { sessionToken: 'valid-token', expires: new Date(Date.now() + 3600000) };

    mockNexusAuth.adapter.getSessionAndUser.mockResolvedValue({ user, session });

    const result = await guard.canActivate(mockContext);

    expect(result).toBe(true);
    expect(mockRequest.user).toEqual(user);
    expect(mockRequest.session).toEqual(session);
  });

  it('should throw UnauthorizedException for invalid session', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    mockRequest.cookies['nexus.session-token'] = 'invalid-token';

    mockNexusAuth.adapter.getSessionAndUser.mockResolvedValue(null);

    await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(mockContext)).rejects.toThrow('Invalid session');
  });

  it('should throw UnauthorizedException for expired session', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    mockRequest.cookies['nexus.session-token'] = 'expired-token';

    const user = { id: '123', email: 'test@example.com' };
    const expiredSession = {
      sessionToken: 'expired-token',
      expires: new Date(Date.now() - 3600000), // Expired 1 hour ago
    };

    mockNexusAuth.adapter.getSessionAndUser.mockResolvedValue({
      user,
      session: expiredSession,
    });

    await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(mockContext)).rejects.toThrow('Session expired');
    expect(mockNexusAuth.adapter.deleteSession).toHaveBeenCalledWith('expired-token');
  });

  it('should throw UnauthorizedException on adapter error', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    mockRequest.cookies['nexus.session-token'] = 'error-token';

    mockNexusAuth.adapter.getSessionAndUser.mockRejectedValue(new Error('Database error'));

    await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(mockContext)).rejects.toThrow('Authentication failed');
  });

  it('should preserve UnauthorizedException from adapter', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    mockRequest.cookies['nexus.session-token'] = 'error-token';

    const customError = new UnauthorizedException('Custom auth error');
    mockNexusAuth.adapter.getSessionAndUser.mockRejectedValue(customError);

    await expect(guard.canActivate(mockContext)).rejects.toThrow('Custom auth error');
  });
});
