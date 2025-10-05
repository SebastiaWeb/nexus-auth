import { mongooseAdapter } from './mongoose-adapter.js';

describe('mongooseAdapter', () => {
  it('should work', () => {
    expect(mongooseAdapter()).toEqual('mongoose-adapter');
  });
});
