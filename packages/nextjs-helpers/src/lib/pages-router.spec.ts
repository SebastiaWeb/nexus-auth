import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getSessionFromReq,
  withAuth,
  withAuthSSR,
  handleSignOut,
} from './pages-router';

describe('Next.js Pages Router Helpers', () => {
  let mockNexusAuth: any;
  let mockReq: any;
  let mockRes: any;

  beforeEach(() => {
    mockNexusAuth = {
      adapter: {
        getSessionAndUser: vi.fn(),
        deleteSession: vi.fn(),
      },
    };

    mockReq = {
      cookies: {},
    };

    mockRes = {
      writeHead: vi.fn(),
      end: vi.fn(),
      setHeader: vi.fn(),
    };
  });

  describe('getSessionFromReq', () => {
    it('should return null when no session token', async () => {
      const result = await getSessionFromReq(mockNexusAuth, mockReq);

      expect(result).toBeNull();
    });

    it('should return session and user for valid token', async () => {
      const user = { id: '123', email: 'test@example.com' };
      const session = { sessionToken: 'token123', expires: new Date(Date.now() + 3600000) };

      mockReq.cookies['nexus.session-token'] = 'token123';
      mockNexusAuth.adapter.getSessionAndUser.mockResolvedValue({ user, session });

      const result = await getSessionFromReq(mockNexusAuth, mockReq);

      expect(result).toEqual({ user, session });
    });

    it('should delete and return null for expired session', async () => {
      const user = { id: '123', email: 'test@example.com' };
      const expiredSession = {
        sessionToken: 'token123',
        expires: new Date(Date.now() - 3600000),
      };

      mockReq.cookies['nexus.session-token'] = 'token123';
      mockNexusAuth.adapter.getSessionAndUser.mockResolvedValue({
        user,
        session: expiredSession,
      });

      const result = await getSessionFromReq(mockNexusAuth, mockReq);

      expect(result).toBeNull();
      expect(mockNexusAuth.adapter.deleteSession).toHaveBeenCalledWith('token123');
    });
  });

  describe('withAuth', () => {
    it('should call handler with user when authenticated', async () => {
      const user = { id: '123', email: 'test@example.com' };
      const session = { sessionToken: 'token123', expires: new Date(Date.now() + 3600000) };
      const handler = vi.fn().mockResolvedValue({ status: 200 });

      mockReq.cookies['nexus.session-token'] = 'token123';
      mockNexusAuth.adapter.getSessionAndUser.mockResolvedValue({ user, session });

      const wrappedHandler = withAuth(mockNexusAuth, handler);
      await wrappedHandler(mockReq, mockRes);

      expect(handler).toHaveBeenCalledWith(mockReq, mockRes, user);
    });

    it('should return 401 when not authenticated', async () => {
      const handler = vi.fn();

      const wrappedHandler = withAuth(mockNexusAuth, handler);
      await wrappedHandler(mockReq, mockRes);

      expect(mockRes.writeHead).toHaveBeenCalledWith(401, { 'Content-Type': 'application/json' });
      expect(mockRes.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Unauthorized' }));
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('withAuthSSR', () => {
    it('should return props with user when authenticated', async () => {
      const user = { id: '123', email: 'test@example.com' };
      const session = { sessionToken: 'token123', expires: new Date(Date.now() + 3600000) };
      const getServerSidePropsHandler = vi.fn().mockResolvedValue({
        props: { data: 'test' },
      });

      mockReq.cookies['nexus.session-token'] = 'token123';
      mockNexusAuth.adapter.getSessionAndUser.mockResolvedValue({ user, session });

      const wrappedHandler = withAuthSSR(mockNexusAuth, getServerSidePropsHandler);
      const result = await wrappedHandler({ req: mockReq, res: mockRes } as any);

      expect(getServerSidePropsHandler).toHaveBeenCalled();
      expect(result).toEqual({
        props: {
          data: 'test',
          user,
        },
      });
    });

    it('should redirect to login when not authenticated', async () => {
      const getServerSidePropsHandler = vi.fn();

      const wrappedHandler = withAuthSSR(mockNexusAuth, getServerSidePropsHandler);
      const result = await wrappedHandler({ req: mockReq, res: mockRes } as any);

      expect(result).toEqual({
        redirect: {
          destination: '/login',
          permanent: false,
        },
      });
      expect(getServerSidePropsHandler).not.toHaveBeenCalled();
    });

    it('should use custom redirect path', async () => {
      const getServerSidePropsHandler = vi.fn();

      const wrappedHandler = withAuthSSR(mockNexusAuth, getServerSidePropsHandler, {
        redirectTo: '/auth/signin',
      });
      const result = await wrappedHandler({ req: mockReq, res: mockRes } as any);

      expect(result).toEqual({
        redirect: {
          destination: '/auth/signin',
          permanent: false,
        },
      });
    });
  });

  describe('handleSignOut', () => {
    it('should delete session and clear cookie', async () => {
      mockReq.cookies['nexus.session-token'] = 'token123';

      await handleSignOut(mockNexusAuth, mockReq, mockRes);

      expect(mockNexusAuth.adapter.deleteSession).toHaveBeenCalledWith('token123');
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Set-Cookie',
        'nexus.session-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
      );
      expect(mockRes.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'application/json' });
      expect(mockRes.end).toHaveBeenCalledWith(JSON.stringify({ success: true }));
    });

    it('should only clear cookie when no session token', async () => {
      await handleSignOut(mockNexusAuth, mockReq, mockRes);

      expect(mockNexusAuth.adapter.deleteSession).not.toHaveBeenCalled();
      expect(mockRes.setHeader).toHaveBeenCalled();
    });
  });
});
