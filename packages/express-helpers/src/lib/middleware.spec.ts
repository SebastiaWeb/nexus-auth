import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createAuthMiddleware,
  optionalAuth,
  requireAuth,
  getCurrentUser,
  getCurrentSession,
  signOut,
} from './middleware';

describe('Express Helpers', () => {
  let mockNexusAuth: any;
  let mockReq: any;
  let mockRes: any;
  let mockNext: any;

  beforeEach(() => {
    mockNexusAuth = {
      adapter: {
        getSessionAndUser: vi.fn(),
        deleteSession: vi.fn(),
      },
    };

    mockReq = {
      cookies: {},
      user: undefined,
      session: undefined,
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      clearCookie: vi.fn(),
    };

    mockNext = vi.fn();
  });

  describe('createAuthMiddleware', () => {
    it('should return 401 when no session token present and required', async () => {
      const middleware = createAuthMiddleware(mockNexusAuth, { required: true });

      await middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next when no session token but not required', async () => {
      const middleware = createAuthMiddleware(mockNexusAuth, { required: false });

      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should attach user and session when valid token present', async () => {
      const user = { id: '123', email: 'test@example.com' };
      const session = { sessionToken: 'token123', expires: new Date(Date.now() + 3600000) };

      mockReq.cookies['nexus.session-token'] = 'token123';
      mockNexusAuth.adapter.getSessionAndUser.mockResolvedValue({ user, session });

      const middleware = createAuthMiddleware(mockNexusAuth);

      await middleware(mockReq, mockRes, mockNext);

      expect(mockReq.user).toEqual(user);
      expect(mockReq.session).toEqual(session);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 401 when session not found in database', async () => {
      mockReq.cookies['nexus.session-token'] = 'invalid-token';
      mockNexusAuth.adapter.getSessionAndUser.mockResolvedValue(null);

      const middleware = createAuthMiddleware(mockNexusAuth, { required: true });

      await middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid session' });
    });

    it('should delete and reject expired session', async () => {
      const expiredSession = {
        user: { id: '123' },
        session: { sessionToken: 'token123', expires: new Date(Date.now() - 3600000) },
      };

      mockReq.cookies['nexus.session-token'] = 'token123';
      mockNexusAuth.adapter.getSessionAndUser.mockResolvedValue(expiredSession);

      const middleware = createAuthMiddleware(mockNexusAuth, { required: true });

      await middleware(mockReq, mockRes, mockNext);

      expect(mockNexusAuth.adapter.deleteSession).toHaveBeenCalledWith('token123');
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Session expired' });
    });

    it('should call custom onUnauthorized handler', async () => {
      const onUnauthorized = vi.fn();
      const middleware = createAuthMiddleware(mockNexusAuth, {
        required: true,
        onUnauthorized,
      });

      await middleware(mockReq, mockRes, mockNext);

      expect(onUnauthorized).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should call custom onError handler on exception', async () => {
      const error = new Error('Database error');
      const onError = vi.fn();

      mockReq.cookies['nexus.session-token'] = 'token123';
      mockNexusAuth.adapter.getSessionAndUser.mockRejectedValue(error);

      const middleware = createAuthMiddleware(mockNexusAuth, { onError });

      await middleware(mockReq, mockRes, mockNext);

      expect(onError).toHaveBeenCalledWith(error, mockReq, mockRes, mockNext);
    });

    it('should return 500 on error without custom handler', async () => {
      const error = new Error('Database error');

      mockReq.cookies['nexus.session-token'] = 'token123';
      mockNexusAuth.adapter.getSessionAndUser.mockRejectedValue(error);

      const middleware = createAuthMiddleware(mockNexusAuth);

      await middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });

  describe('optionalAuth', () => {
    it('should create middleware with required: false', async () => {
      const middleware = optionalAuth(mockNexusAuth);

      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('requireAuth', () => {
    it('should create middleware with required: true', async () => {
      const middleware = requireAuth(mockNexusAuth);

      await middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should accept additional options', async () => {
      const onUnauthorized = vi.fn();
      const middleware = requireAuth(mockNexusAuth, { onUnauthorized });

      await middleware(mockReq, mockRes, mockNext);

      expect(onUnauthorized).toHaveBeenCalled();
    });
  });

  describe('getCurrentUser', () => {
    it('should return user from request', () => {
      const user = { id: '123', email: 'test@example.com' };
      mockReq.user = user;

      const result = getCurrentUser(mockReq);

      expect(result).toEqual(user);
    });

    it('should return null when no user present', () => {
      const result = getCurrentUser(mockReq);

      expect(result).toBeNull();
    });
  });

  describe('getCurrentSession', () => {
    it('should return session from request', () => {
      const session = { sessionToken: 'token123', expires: new Date() };
      mockReq.session = session;

      const result = getCurrentSession(mockReq);

      expect(result).toEqual(session);
    });

    it('should return null when no session present', () => {
      const result = getCurrentSession(mockReq);

      expect(result).toBeNull();
    });
  });

  describe('signOut', () => {
    it('should delete session and clear cookie', async () => {
      mockReq.cookies['nexus.session-token'] = 'token123';
      mockReq.user = { id: '123' };
      mockReq.session = { sessionToken: 'token123' };

      await signOut(mockNexusAuth, mockReq, mockRes);

      expect(mockNexusAuth.adapter.deleteSession).toHaveBeenCalledWith('token123');
      expect(mockRes.clearCookie).toHaveBeenCalledWith('nexus.session-token');
      expect(mockReq.user).toBeUndefined();
      expect(mockReq.session).toBeUndefined();
    });

    it('should only clear cookie when no session token present', async () => {
      await signOut(mockNexusAuth, mockReq, mockRes);

      expect(mockNexusAuth.adapter.deleteSession).not.toHaveBeenCalled();
      expect(mockRes.clearCookie).toHaveBeenCalledWith('nexus.session-token');
    });
  });
});
