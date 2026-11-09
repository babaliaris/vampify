import { test, describe } from 'node:test';
import assert from 'node:assert';
import { FastifyPluginAsync } from 'fastify';
import { eq } from 'drizzle-orm';
import { vampifySetupE2E } from "@vampify/test";
import { VAMPIFY_LITERALS, VampifyInstance } from '@vampify/literals';
import { vampifyApp } from "@/sandbox/app.js";
import { VampifyLogsTable } from '@/sandbox/db/schema.js';

// The real request schema of the template's vampify-logs POST.
import { FastifyLogPostSchema } from '../../../create-template/src/typescript/api-schemas/vampify-logs.schema.js';


/**
 * The vampify-logs POST lives in the template (src/create-template/src/routes/logs.ts),
 * which can't be booted here. This mock mirrors its handler and uses the template's
 * actual FastifyLogPostSchema, so the schema's Ajv coercion is what's under test.
 */
const ROUTE = '/test-vampify-logs';

const mock_routes: FastifyPluginAsync = async (instance) =>
{
  const fastify = instance as VampifyInstance;

  fastify.post(ROUTE,
  {
    preHandler: [fastify.vampifyServiceAuth],
    schema    : { body: FastifyLogPostSchema }
  }, async (req, rep) =>
  {
    await fastify.db.insert(VampifyLogsTable).values(
    {
      req_id    : req.body.req_id || req.id,
      user_id   : req.body.user_id ?? null,
      ip        : req.body.ip,
      level     : req.body.level,
      message   : req.body.message,
      data      : req.body.data,
      url       : req.body.url || null,
      method    : req.body.method || null,
      status    : req.body.status || null,
      timestamp : new Date(req.body.timestamp)
    });

    return rep.status(202).send(null);
  });
};


describe('Vampify Logs POST Tests', () =>
{
  const e2e_suite = vampifySetupE2E(vampifyApp, mock_routes);

  // A unique message per test, to find the stored row.
  const post = (fastify: VampifyInstance, message: string, extra: Record<string, unknown>, withKey = true) =>
    fastify.inject(
    {
      method : 'POST',
      url    : ROUTE,
      headers: withKey ? { [VAMPIFY_LITERALS.X_SERVICE_API_KEY]: process.env.LOG_SHIPPER_KEY } : {},
      payload:
      {
        ip        : '127.0.0.1',
        level     : 'info',
        message   : message,
        timestamp : new Date().toISOString(),
        ...extra
      }
    });

  const rowsOf = (fastify: VampifyInstance, message: string) =>
    fastify.db.select().from(VampifyLogsTable).where(eq(VampifyLogsTable.message, message));


  test('user_id: 20 is stored as 20', async () =>
  {
    await e2e_suite.runInTransaction(async (fastify) =>
    {
      const res = await post(fastify, 'vampify-logs user 20', { user_id: 20 });
      assert.strictEqual(res.statusCode, 202);

      const rows = await rowsOf(fastify, 'vampify-logs user 20');
      assert.strictEqual(rows.length, 1);
      assert.strictEqual(rows[0].user_id, 20);
    });
  });


  test('user_id: null is stored as NULL (not coerced to 0)', async () =>
  {
    await e2e_suite.runInTransaction(async (fastify) =>
    {
      const res = await post(fastify, 'vampify-logs user null', { user_id: null });
      assert.strictEqual(res.statusCode, 202);

      const rows = await rowsOf(fastify, 'vampify-logs user null');
      assert.strictEqual(rows.length, 1);
      assert.strictEqual(rows[0].user_id, null);
    });
  });


  test('omitted user_id is stored as NULL', async () =>
  {
    await e2e_suite.runInTransaction(async (fastify) =>
    {
      const res = await post(fastify, 'vampify-logs user omitted', {});
      assert.strictEqual(res.statusCode, 202);

      const rows = await rowsOf(fastify, 'vampify-logs user omitted');
      assert.strictEqual(rows.length, 1);
      assert.strictEqual(rows[0].user_id, null);
    });
  });


  test('missing x-service-api-key returns 401 and stores nothing', async () =>
  {
    await e2e_suite.runInTransaction(async (fastify) =>
    {
      const res = await post(fastify, 'vampify-logs no key', { user_id: 20 }, false);
      assert.strictEqual(res.statusCode, 401);

      const rows = await rowsOf(fastify, 'vampify-logs no key');
      assert.strictEqual(rows.length, 0);
    });
  });
});
