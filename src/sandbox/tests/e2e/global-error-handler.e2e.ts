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
});
