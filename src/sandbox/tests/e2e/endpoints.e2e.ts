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



  test('Should perform full Cookie + Footprint flow', async () =>
  {
    // Login to get the cookie
    const loginRes = await e2e_suite.fastify.inject(
    {
      method: 'GET',
      url   : ROUTE_ENDPOINTS.CREDENTIALS.ROOT
    });

    assert.strictEqual(loginRes.statusCode, 200);

    // Get the cookie from headers
    // The header looks like: vampify_token=abc...; HttpOnly; Path=/
    const cookieHeader = loginRes.headers['set-cookie'];
    assert.ok(cookieHeader, 'Login should return a set-cookie header');

    // Use the cookie to access the protected route
    const checkRes = await e2e_suite.fastify.inject({
      method  : 'GET',
      url     : ROUTE_ENDPOINTS.CREDENTIALS.CHECK_PAYLOAD,
      headers :
      {
        // We pass the cookie string back exactly as received
        cookie: Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader
      }
    });

    assert.strictEqual(checkRes.statusCode, 200);
    assert.strictEqual(checkRes.payload, "Payload checked successfully!");
  });



  test('Should fail if the Digital Footprint is compromised', async () =>
  {
    // 1. Login to get a valid cookie
    const loginRes = await e2e_suite.fastify.inject(
    {
      method  : 'GET',
      url     : ROUTE_ENDPOINTS.CREDENTIALS.ROOT,
      headers : { 'user-agent': 'VampireBrowser/1.0' }
    });

    const cookie = loginRes.headers['set-cookie'];

    // 2. Attempt to use that cookie from a DIFFERENT User-Agent
    const maliciousRes = await e2e_suite.fastify.inject({
      method  : 'GET',
      url     : ROUTE_ENDPOINTS.CREDENTIALS.CHECK_PAYLOAD,
      headers :
      {
        cookie: Array.isArray(cookie) ? cookie[0] : cookie,
        'user-agent': 'HackerBrowser/2.0' // Footprint mismatch!
      }
    });

    assert.strictEqual(maliciousRes.statusCode, 401);
  });


  test('should hash and compare password correctly', async()=>
  {
    const password = "this-is-a-password";
  
    const hash = await e2e_suite.fastify.vampifyHashCreate(password);

    const success = await e2e_suite.fastify.vampifyHashCompare(password, hash);

    assert.strictEqual(success, true);
  });

});