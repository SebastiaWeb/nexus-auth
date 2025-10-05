import { prismaAdapter } from './prisma-adapter.js';

describe('prismaAdapter', () => {
  it('should work', () => {
    expect(prismaAdapter()).toEqual('prisma-adapter');
  });
});
