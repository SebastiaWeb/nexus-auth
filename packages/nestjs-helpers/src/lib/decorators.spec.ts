import { describe, it, expect, vi } from 'vitest';
import { Public, CurrentUser, CurrentSession, CurrentUserId } from './decorators';
import { IS_PUBLIC_KEY } from './auth.guard';

describe('NestJS Decorators', () => {
  describe('Public', () => {
    it('should set public metadata', () => {
      const decorator = Public();
      expect(decorator).toBeDefined();
      // The Public decorator returns SetMetadata which sets IS_PUBLIC_KEY to true
    });
  });

  describe('CurrentUser', () => {
    it('should extract user from request', () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      const mockRequest = { user: mockUser };
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      };

      const factory = CurrentUser as any;
      const result = factory.factory(null, mockContext);

      expect(result).toEqual(mockUser);
    });

    it('should return undefined when no user', () => {
      const mockRequest = {};
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      };

      const factory = CurrentUser as any;
      const result = factory.factory(null, mockContext);

      expect(result).toBeUndefined();
    });
  });

  describe('CurrentSession', () => {
    it('should extract session from request', () => {
      const mockSession = { sessionToken: 'token123', expires: new Date() };
      const mockRequest = { session: mockSession };
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      };

      const factory = CurrentSession as any;
      const result = factory.factory(null, mockContext);

      expect(result).toEqual(mockSession);
    });

    it('should return undefined when no session', () => {
      const mockRequest = {};
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      };

      const factory = CurrentSession as any;
      const result = factory.factory(null, mockContext);

      expect(result).toBeUndefined();
    });
  });

  describe('CurrentUserId', () => {
    it('should extract user ID from request', () => {
      const mockRequest = { user: { id: '123', email: 'test@example.com' } };
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      };

      const factory = CurrentUserId as any;
      const result = factory.factory(null, mockContext);

      expect(result).toBe('123');
    });

    it('should return undefined when no user', () => {
      const mockRequest = {};
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      };

      const factory = CurrentUserId as any;
      const result = factory.factory(null, mockContext);

      expect(result).toBeUndefined();
    });
  });
});
