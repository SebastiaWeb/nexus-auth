import { sqlAdapter } from './sql-adapter.js';

describe('sqlAdapter', () => {
  it('should work', () => {
    expect(sqlAdapter()).toEqual('sql-adapter');
  });
});
