import { test } from 'node:test';
import assert from 'node:assert';

test('CPU Testing', () =>
{
  assert.strictEqual(50+30, 80);
  assert.strictEqual(2*10, 20);
  assert.strictEqual(20/2, 10);
});