import { test, describe} from 'node:test';
import assert from 'node:assert';
import { vampifySetupE2E } from "@vampify/test";
import { vampifyApp } from "../../app.js";
import { ROUTE_ENDPOINTS } from "../../literals.js"

describe('Vampify Framework Tests', () => 
{
  const e2e_setup = vampifySetupE2E(vampifyApp);

  test(`GET ${ROUTE_ENDPOINTS.HEALTH.ROOT}`, async () =>
  {
      const response = await e2e_setup.fastify.inject({
        method: 'GET',
        url   : ROUTE_ENDPOINTS.HEALTH.ROOT
      });

      assert.strictEqual(response.statusCode, 200);
    });
});