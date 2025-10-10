import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/headers before importing
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

import { getSession, getCurrentUser, requireAuth, signOut } from './app-router';
import { cookies } from 'next/headers';

describe('Next.js App Router Helpers', () => {
  let mockNexusAuth: any;
  let mockCookieStore: any;

  beforeEach(() => {
    mockNexusAuth = {
      adapter: {
        getSessionAndUser: vi.fn(),
        deleteSession: vi.fn(),
      },
    };

    mockCookieStore = {
      get: vi.fn(),
      delete: vi.fn(),
    };

    vi.mocked(cookies).mockResolvedValue(mockCookieStore as any);
  });

  describe('getSession', () => {
    it('should return null when no session token', async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      const result = await getSession(mockNexusAuth);

      expect(result).toBeNull();
    });

    it('should return null when session not found', async () => {
      mockCookieStore.get.mockReturnValue({ value: 'token123' });
      mockNexusAuth.adapter.getSessionAndUser.mockResolvedValue(null);

      const result = await getSession(mockNexusAuth);

      expect(result).toBeNull();
    });

    it('should return session and user for valid token', async () => {
      const user = { id: '123', email: 'test@example.com' };
      const session = { sessionToken: 'token123', expires: new Date(Date.now() + 3600000) };

      mockCookieStore.get.mockReturnValue({ value: 'token123' });
      mockNexusAuth.adapter.getSessionAndUser.mockResolvedValue({ user, session });

      const result = await getSession(mockNexusAuth);

      expect(result).toEqual({ user, session });
    });

    it('should delete and return null for expired session', async () => {
      const user = { id: '123', email: 'test@example.com' };
      const expiredSession = {
        sessionToken: 'token123',
        expires: new Date(Date.now() - 3600000),
      };

      mockCookieStore.get.mockReturnValue({ value: 'token123' });
      mockNexusAuth.adapter.getSessionAndUser.mockResolvedValue({
        user,
        session: expiredSession,
      });

      const result = await getSession(mockNexusAuth);

      expect(result).toBeNull();
      expect(mockNexusAuth.adapter.deleteSession).toHaveBeenCalledWith('token123');
    });
  });

  describe('getCurrentUser', () => {
    it('should return user from session', async () => {
      const user = { id: '123', email: 'test@example.com' };
      const session = { sessionToken: 'token123', expires: new Date(Date.now() + 3600000) };

      mockCookieStore.get.mockReturnValue({ value: 'token123' });
      mockNexusAuth.adapter.getSessionAndUser.mockResolvedValue({ user, session });

      const result = await getCurrentUser(mockNexusAuth);

      expect(result).toEqual(user);
    });

    it('should return null when no session', async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      const result = await getCurrentUser(mockNexusAuth);

      expect(result).toBeNull();
    });
  });

  describe('requireAuth', () => {
    it('should return user when authenticated', async () => {
      const user = { id: '123', email: 'test@example.com' };
      const session = { sessionToken: 'token123', expires: new Date(Date.now() + 3600000) };

      mockCookieStore.get.mockReturnValue({ value: 'token123' });
      mockNexusAuth.adapter.getSessionAndUser.mockResolvedValue({ user, session });

      const result = await requireAuth(mockNexusAuth);

      expect(result).toEqual(user);
    });

    it('should throw error when not authenticated', async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      await expect(requireAuth(mockNexusAuth)).rejects.toThrow('Unauthorized');
    });
  });

  describe('signOut', () => {
    it('should delete session and clear cookie', async () => {
      mockCookieStore.get.mockReturnValue({ value: 'token123' });

      await signOut(mockNexusAuth);

      expect(mockNexusAuth.adapter.deleteSession).toHaveBeenCalledWith('token123');
      expect(mockCookieStore.delete).toHaveBeenCalledWith('nexus.session-token');
    });

    it('should only clear cookie when no session token', async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      await signOut(mockNexusAuth);

      expect(mockNexusAuth.adapter.deleteSession).not.toHaveBeenCalled();
      expect(mockCookieStore.delete).toHaveBeenCalledWith('nexus.session-token');
    });
  });
});
