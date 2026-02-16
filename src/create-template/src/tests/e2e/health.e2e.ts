import { test, describe} from 'node:test';
import assert from 'node:assert';
import { FastifyInstance } from 'fastify';
import { vampifySetupE2E } from "@vampify/test";
import {vampifyApp} from "../../app.js";

describe('User Routes E2E', () => 
{
  const e2e_setup = vampifySetupE2E(vampifyApp);

  test('GET /health', async () =>
  {
    await e2e_setup.runInTransaction(async (fastify: FastifyInstance)=>
    {
      const response = await fastify.inject({
        method: 'GET',
        url: '/health'
      });

      assert.strictEqual(response.statusCode, 200);
    });
  });
});