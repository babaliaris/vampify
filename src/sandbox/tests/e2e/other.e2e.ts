import { test, describe} from 'node:test';
import assert from 'node:assert';
import { vampifySetupE2E } from "@vampify/test";
import {vampifyApp} from "../../app.js";
import { ROUTE_ENDPOINTS } from '../../literals.js';

describe('Vampify Framework Tests', () => 
{
  const e2e_suite = vampifySetupE2E(vampifyApp);

  test(`GET ${ROUTE_ENDPOINTS.HEALTH.ROOT}`, async () =>
  {

    const response = await e2e_suite.fastify.inject({
      method: 'GET',
      url   : ROUTE_ENDPOINTS.HEALTH.ROOT
    });

    assert.strictEqual(response.statusCode, 200);
  });



  test('Environment Variables', async () =>
  {
    assert(e2e_suite.fastify.vampifyIsTestMode() === true);
    assert(e2e_suite.fastify.vampifyIsDevMode() === false);
    assert(e2e_suite.fastify.vampifyIsProdMode() === false);
    assert(e2e_suite.fastify.getEnvs().DB_DEBUG === false);
    assert(e2e_suite.fastify.getEnvs().DB_HOST === "localhost");
    assert(e2e_suite.fastify.getEnvs().DB_LIMIT >= 0);
    assert(e2e_suite.fastify.getEnvs().DB_NAME === "vampify_test");
    assert(e2e_suite.fastify.getEnvs().DB_PASS === "0401");
    assert(e2e_suite.fastify.getEnvs().DB_URL === "mysql://root:0401@localhost:3306/vampify_test");
    assert(e2e_suite.fastify.getEnvs().DB_USER === "root");
    assert(e2e_suite.fastify.getEnvs().JWT_EXPIRES === 60);
    assert(e2e_suite.fastify.getEnvs().JWT_SECRET === "just_a_secret_key");
    assert(e2e_suite.fastify.getEnvs().SERVER_PORT === 3000);
  });

});