import { test } from 'node:test';
import assert from 'node:assert';

test('General Unit Tests', () =>
{
  assert.strictEqual(50+30, 80);
  assert.strictEqual(2*10, 20);
  assert.strictEqual(20/2, 10);
});