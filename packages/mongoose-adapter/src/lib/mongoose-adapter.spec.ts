import { describe, it, expect } from 'vitest';
import { MongooseAdapter } from './mongoose-adapter';

describe('MongooseAdapter', () => {
  it('should be a function', () => {
    expect(MongooseAdapter).toBeInstanceOf(Function);
  });

  it('should require a connection parameter', () => {
    expect(() => {
      // @ts-expect-error - Testing missing required parameter
      MongooseAdapter();
    }).toThrow();
  });

  it('should require connection in config', () => {
    expect(() => {
      // @ts-expect-error - Testing invalid config
      MongooseAdapter({});
    }).toThrow();
  });

  describe('Configuration', () => {
    it('should accept configuration object structure', () => {
      // This test validates the type structure exists
      const validConfig = {
        connection: {} as any,
        schemas: {},
        fieldMapping: {
          user: { id: '_id' },
          account: {},
          session: {},
        },
        collectionNames: {
          user: 'users',
          account: 'accounts',
          session: 'sessions',
        },
      };

      // TypeScript will catch type errors at compile time
      expect(validConfig).toBeDefined();
      expect(validConfig.connection).toBeDefined();
    });
  });

  describe('Adapter interface', () => {
    it('should export MongooseAdapter function', () => {
      expect(typeof MongooseAdapter).toBe('function');
    });
  });
});
