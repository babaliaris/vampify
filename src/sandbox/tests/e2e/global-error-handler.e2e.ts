import { test, describe} from 'node:test';
import assert from 'node:assert';
import { vampifySetupE2E } from "@vampify/test";
import {vampifyApp} from "@/sandbox/app.js";
import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import { usersTable } from '@/sandbox/db/schema.js';


const mock_routes: FastifyPluginAsync = async (fastify)=>
{
    // Try to add the same email twice (email is unique).
    fastify.post('/test-duplicated-entry-error', async (req, rep) =>
    {
      await fastify.db.insert(usersTable).values({
        email             : "retry@vampify.io",
        password          : "123",
        verification_hash : "hash",
        is_verified       : true
      });

      await fastify.db.insert(usersTable).values({
        email             : "retry@vampify.io",
        password          : "123",
        verification_hash : "hash",
        is_verified       : true
      });
    });

    // Try to cause a validation error.
    fastify.get('/test-error-validation/:id',
    {
      schema: {
        params: Type.Object(
        {
          id: Type.Number()
        })
      }
    }, async () => {
      return { ok: true };
    });

    // Return a Random error.
    fastify.get('/test-error-generic', async () => {
      throw new Error('Boom!');
    });

    // Simulate the mysql2 driver error for deleting a parent row that is still referenced.
    // (Creating real FK tables here would need DDL, which implicitly commits the test transaction.)
    fastify.delete('/test-row-is-referenced', async () => {
      const err: any = new Error('Cannot delete or update a parent row: a foreign key constraint fails');
      err.code  = 'ER_ROW_IS_REFERENCED_2';
      err.errno = 1451;
      throw err;
    });
};


describe('Vampify Framework Tests', () => 
{
  const e2e_suite = vampifySetupE2E(vampifyApp, mock_routes);

  test('should transform ER_DUP_ENTRY into 409 Conflict', async () =>
  {
    await e2e_suite.runInTransaction(async ()=>
    {
      const response = await e2e_suite.fastify.inject(
      {
        method: 'POST',
        url: '/test-duplicated-entry-error'
      });

      const payload = JSON.parse(response.payload);

      assert.strictEqual(response.statusCode, 409);
    });
  });

  test('should transform TypeBox validation errors into 400 Bad Request', async () =>
  {
    const response = await e2e_suite.fastify.inject({
      method: 'GET',
      url: '/test-error-validation/not-a-number'
    });

    const payload = JSON.parse(response.payload);

    assert.strictEqual(response.statusCode, 400);
    assert.ok(payload.message, 'Should contain a message');
    assert.ok(payload.details, 'Should contain validation details');
  });

  test('should return 500 for unknown generic errors', async () =>
  {
    // This shoud return a random error that causes an 500 internal server error.
    const response = await e2e_suite.fastify.inject({
      method: 'GET',
      url: '/test-error-generic'
    });

    const payload = JSON.parse(response.payload);

    assert.strictEqual(response.statusCode, 500);
  });

  test('should transform ER_ROW_IS_REFERENCED_2 into 409 Conflict', async () =>
  {
    const response = await e2e_suite.fastify.inject({
      method: 'DELETE',
      url: '/test-row-is-referenced'
    });

    const payload = JSON.parse(response.payload);

    assert.strictEqual(response.statusCode, 409);
    assert.strictEqual(payload.error, 'Conflict');
  });
});
