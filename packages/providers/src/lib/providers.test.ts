import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoogleProvider } from './google';
import { GitHubProvider } from './github';
import { FacebookProvider } from './facebook';
import { MicrosoftProvider } from './microsoft';

describe('OAuth Providers', () => {
  describe('GoogleProvider', () => {
    it('should create provider with correct configuration', () => {
      const provider = GoogleProvider({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
      });

      expect(provider.id).toBe('google');
      expect(provider.type).toBe('oauth');
    });

    it('should generate valid authorization URL', async () => {
      const provider = GoogleProvider({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        callbackUrl: 'http://localhost:3000/auth/callback/google',
      });

      const authUrl = await provider.getAuthorizationUrl({ state: 'test-state' });

      expect(authUrl).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(authUrl).toContain('client_id=test-client-id');
      expect(authUrl).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fcallback%2Fgoogle');
      expect(authUrl).toContain('response_type=code');
      expect(authUrl).toContain('scope=openid+email+profile');
      expect(authUrl).toContain('state=test-state');
    });

    it('should use default callback URL when not provided', async () => {
      const provider = GoogleProvider({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
      });

      const authUrl = await provider.getAuthorizationUrl();

      expect(authUrl).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fauth%2Fcallback%2Fgoogle');
    });
  });

  describe('GitHubProvider', () => {
    it('should create provider with correct configuration', () => {
      const provider = GitHubProvider({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
      });

      expect(provider.id).toBe('github');
      expect(provider.type).toBe('oauth');
    });

    it('should generate valid authorization URL', async () => {
      const provider = GitHubProvider({
        clientId: 'github-client-id',
        clientSecret: 'github-client-secret',
        callbackUrl: 'http://localhost:3000/auth/callback/github',
      });

      const authUrl = await provider.getAuthorizationUrl({ state: 'test-state' });

      expect(authUrl).toContain('https://github.com/login/oauth/authorize');
      expect(authUrl).toContain('client_id=github-client-id');
      expect(authUrl).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fcallback%2Fgithub');
      expect(authUrl).toContain('response_type=code');
      expect(authUrl).toContain('scope=read%3Auser+user%3Aemail');
      expect(authUrl).toContain('state=test-state');
    });
  });

  describe('FacebookProvider', () => {
    it('should create provider with correct configuration', () => {
      const provider = FacebookProvider({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
      });

      expect(provider.id).toBe('facebook');
      expect(provider.type).toBe('oauth');
    });

    it('should generate valid authorization URL', async () => {
      const provider = FacebookProvider({
        clientId: 'fb-client-id',
        clientSecret: 'fb-client-secret',
        callbackUrl: 'http://localhost:3000/auth/callback/facebook',
      });

      const authUrl = await provider.getAuthorizationUrl({ state: 'test-state' });

      expect(authUrl).toContain('https://www.facebook.com/v18.0/dialog/oauth');
      expect(authUrl).toContain('client_id=fb-client-id');
      expect(authUrl).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fcallback%2Ffacebook');
      expect(authUrl).toContain('response_type=code');
      expect(authUrl).toContain('state=test-state');
    });
  });

  describe('MicrosoftProvider', () => {
    it('should create provider with correct configuration', () => {
      const provider = MicrosoftProvider({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
      });

      expect(provider.id).toBe('microsoft');
      expect(provider.type).toBe('oauth');
    });

    it('should generate valid authorization URL with common tenant', async () => {
      const provider = MicrosoftProvider({
        clientId: 'ms-client-id',
        clientSecret: 'ms-client-secret',
        callbackUrl: 'http://localhost:3000/auth/callback/microsoft',
      });

      const authUrl = await provider.getAuthorizationUrl({ state: 'test-state' });

      expect(authUrl).toContain('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
      expect(authUrl).toContain('client_id=ms-client-id');
      expect(authUrl).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fcallback%2Fmicrosoft');
      expect(authUrl).toContain('response_type=code');
      expect(authUrl).toContain('state=test-state');
    });

    it('should support custom tenant ID', async () => {
      const provider = MicrosoftProvider({
        clientId: 'ms-client-id',
        clientSecret: 'ms-client-secret',
        tenant: 'custom-tenant-id',
        callbackUrl: 'http://localhost:3000/auth/callback/microsoft',
      });

      const authUrl = await provider.getAuthorizationUrl({ state: 'test-state' });

      expect(authUrl).toContain('https://login.microsoftonline.com/custom-tenant-id/oauth2/v2.0/authorize');
    });
  });

  describe('Provider URL Validation', () => {
    it('Google URLs should be valid', async () => {
      const provider = GoogleProvider({
        clientId: 'test',
        clientSecret: 'test',
      });

      const authUrl = await provider.getAuthorizationUrl();
      const url = new URL(authUrl);

      expect(url.protocol).toBe('https:');
      expect(url.hostname).toBe('accounts.google.com');
      expect(url.searchParams.get('client_id')).toBe('test');
      expect(url.searchParams.get('response_type')).toBe('code');
    });

    it('GitHub URLs should be valid', async () => {
      const provider = GitHubProvider({
        clientId: 'test',
        clientSecret: 'test',
      });

      const authUrl = await provider.getAuthorizationUrl();
      const url = new URL(authUrl);

      expect(url.protocol).toBe('https:');
      expect(url.hostname).toBe('github.com');
      expect(url.searchParams.get('client_id')).toBe('test');
      expect(url.searchParams.get('response_type')).toBe('code');
    });

    it('Facebook URLs should be valid', async () => {
      const provider = FacebookProvider({
        clientId: 'test',
        clientSecret: 'test',
      });

      const authUrl = await provider.getAuthorizationUrl();
      const url = new URL(authUrl);

      expect(url.protocol).toBe('https:');
      expect(url.hostname).toBe('www.facebook.com');
      expect(url.searchParams.get('client_id')).toBe('test');
      expect(url.searchParams.get('response_type')).toBe('code');
    });

    it('Microsoft URLs should be valid', async () => {
      const provider = MicrosoftProvider({
        clientId: 'test',
        clientSecret: 'test',
      });

      const authUrl = await provider.getAuthorizationUrl();
      const url = new URL(authUrl);

      expect(url.protocol).toBe('https:');
      expect(url.hostname).toBe('login.microsoftonline.com');
      expect(url.searchParams.get('client_id')).toBe('test');
      expect(url.searchParams.get('response_type')).toBe('code');
    });
  });
});
