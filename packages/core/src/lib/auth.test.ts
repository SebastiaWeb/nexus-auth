import { describe, it, expect, vi } from 'vitest';
import { NexusAuth } from './auth.js';
import type { NexusAuthConfig } from './config.js';

// Mock bcrypt to prevent native module issues in test environment
vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn((password, rounds) => Promise.resolve(`${password}-hashed-with-${rounds}`)),
    compare: vi.fn((password, hash) => Promise.resolve(hash.startsWith(password))),
  },
}));

// Mock the adapter and providers
const mockAdapter = {
  getUserByEmail: vi.fn(),
  createUser: vi.fn(),
  // Add other necessary mock methods as the class grows
};

const mockProvider = {
  id: 'credentials',
  type: 'credentials' as const,
  name: 'Credentials',
  // Add other necessary mock properties
};

const validConfig: NexusAuthConfig = {
  secret: 'a-very-strong-secret-for-testing',
  adapter: mockAdapter as any,
  providers: [mockProvider as any],
};

describe('NexusAuth Class', () => {
  it('should instantiate without errors with a valid configuration', () => {
    expect(() => new NexusAuth(validConfig)).not.toThrow();
  });

  it('should throw an error if secret is missing', () => {
    const configWithoutSecret = { ...validConfig, secret: undefined as any };
    expect(() => new NexusAuth(configWithoutSecret)).toThrow('A secret is required for signing tokens.');
  });

  it('should throw an error if adapter is missing', () => {
    const configWithoutAdapter = { ...validConfig, adapter: undefined as any };
    expect(() => new NexusAuth(configWithoutAdapter)).toThrow('An adapter is required for database operations.');
  });

  it('should throw an error if providers are missing or empty', () => {
    const configWithoutProviders = { ...validConfig, providers: [] };
    expect(() => new NexusAuth(configWithoutProviders)).toThrow('At least one provider is required.');
  });

  describe('Password Hashing', () => {
    const auth = new NexusAuth(validConfig);

    it('should hash a password', async () => {
      const hashedPassword = await auth.hashPassword('password123');
      expect(hashedPassword).toBe('password123-hashed-with-10');
    });

    it('should compare a password and return true for a match', async () => {
      const result = await auth.comparePassword('password123', 'password123-hashed');
      expect(result).toBe(true);
    });

    it('should compare a password and return false for a mismatch', async () => {
      const result = await auth.comparePassword('wrongpassword', 'password123-hashed');
      expect(result).toBe(false);
    });
  });
});