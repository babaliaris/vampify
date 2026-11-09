import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { Writable } from 'node:stream';
import path from 'node:path';
import dotenv from 'dotenv';
import Fastify, { FastifyPluginAsync } from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { VampifyInstance, VAMPIFY_LITERALS } from '@vampify/literals';
import { vampifyApp } from '@/sandbox/app.js';
import { ROUTE_ENDPOINTS } from '../../literals.js';


/**
 * vampifySetupE2E() uses the env logger config (LOGGING=false in .env.test),
 * so this suite boots its own instance with a logger that writes into memory.
 */

const ROUTE_LOGGED_IN = '/test-logging/user-route';
const ROUTE_SERVICE   = '/test-logging/service-route';
const ROUTE_GUEST     = '/test-logging/guest-route';
const ROUTE_TWICE     = '/test-logging/double-auth-route';

const mock_routes: FastifyPluginAsync = async (fastify) =>
{
  fastify.get(ROUTE_LOGGED_IN, { preHandler: [fastify.vampifyAuth] }, async (req) =>
  {
    req.log.info('route log line');
    return { ok: true };
  });

  fastify.get(ROUTE_SERVICE, { preHandler: [fastify.vampifyServiceAuth] }, async (req) =>
  {
    req.log.info('route log line');
    return { ok: true };
  });

  fastify.get(ROUTE_GUEST, async (req) =>
  {
    req.log.info('route log line');
    return { ok: true };
  });

  // vampifyAuth runs twice in the same request.
  fastify.get(ROUTE_TWICE, { preHandler: [fastify.vampifyAuth, fastify.vampifyAuth] }, async (req) =>
  {
    req.log.info('route log line');
    return { ok: true };
  });
};


describe('Logging Tests', () =>
{
  let fastify: VampifyInstance;
  const lines: any[] = [];

  // Collect every pino JSON line. The raw text is kept in __raw, because
  // JSON.parse() silently merges duplicate keys.
  const stream = new Writable(
  {
    write(chunk, _encoding, callback)
    {
      for (const line of chunk.toString().split('\n'))
      {
        if (line.trim()) lines.push({ ...JSON.parse(line), __raw: line });
      }
      callback();
    }
  });

  // Login through the sandbox route (signs user_id "1") and return the cookie.
  const login = async (): Promise<string> =>
  {
    const loginRes = await fastify.inject({ method: 'GET', url: ROUTE_ENDPOINTS.CREDENTIALS.ROOT });
    const cookie   = loginRes.headers['set-cookie'];
    assert.ok(cookie, 'Login should return a set-cookie header');
    return Array.isArray(cookie) ? cookie[0] : cookie;
  };

  // Return all the log lines of the request that hit the given url.
  const linesOf = (url: string): any[] =>
  {
    const incoming = lines.find((l) => l.msg === 'incoming request' && l.req?.url === url);
    assert.ok(incoming, `No 'incoming request' log line for ${url}`);
    return lines.filter((l) => l.reqId === incoming.reqId);
  };

  // 'request completed' is logged in onResponse, which can run after inject() resolves.
  const flush = () => new Promise((resolve) => setImmediate(resolve));

  before(async () =>
  {
    dotenv.config({ path: path.join(process.cwd(), '.env.test'), quiet: true });

    fastify = Fastify({ logger: { level: 'info', stream } }).withTypeProvider<TypeBoxTypeProvider>();
    await fastify.register(vampifyApp);
    await fastify.register(mock_routes);
    await fastify.ready();
  });

  after(async () =>
  {
    if (fastify) await fastify.close();
  });


  test('Authenticated request log lines carry the vampify_user_id', async () =>
  {
    const res = await fastify.inject(
    {
      method : 'GET',
      url    : ROUTE_LOGGED_IN,
      headers: { cookie: await login() }
    });
    await flush();

    assert.strictEqual(res.statusCode, 200);

    const reqLines  = linesOf(ROUTE_LOGGED_IN);
    const routeLine = reqLines.find((l) => l.msg === 'route log line');
    const completed = reqLines.find((l) => l.msg === 'request completed');
    const incoming  = reqLines.find((l) => l.msg === 'incoming request');

    // The sandbox login route signs user_id "1".
    assert.strictEqual(routeLine?.vampify_user_id, '1', 'Route log line should carry vampify_user_id');
    assert.strictEqual(completed?.vampify_user_id, '1', "'request completed' (reply.log) should carry vampify_user_id");

    // Logged before authentication, so it cannot know the user.
    assert.strictEqual(incoming?.vampify_user_id, undefined);
    assert.strictEqual(incoming?.req?.userId, undefined);
  });


  test('Service-key requests bind no vampify_user_id', async () =>
  {
    const res = await fastify.inject(
    {
      method : 'GET',
      url    : ROUTE_SERVICE,
      headers: { [VAMPIFY_LITERALS.X_SERVICE_API_KEY]: process.env.LOG_SHIPPER_KEY }
    });
    await flush();

    assert.strictEqual(res.statusCode, 200);
    for (const line of linesOf(ROUTE_SERVICE)) assert.strictEqual(line.vampify_user_id, undefined);
  });


  test('Guest requests bind no vampify_user_id', async () =>
  {
    const res = await fastify.inject({ method: 'GET', url: ROUTE_GUEST });
    await flush();

    assert.strictEqual(res.statusCode, 200);
    for (const line of linesOf(ROUTE_GUEST)) assert.strictEqual(line.vampify_user_id, undefined);
  });


  test('Running vampifyAuth twice binds vampify_user_id only once', async () =>
  {
    const res = await fastify.inject(
    {
      method : 'GET',
      url    : ROUTE_TWICE,
      headers: { cookie: await login() }
    });
    await flush();

    assert.strictEqual(res.statusCode, 200);

    const reqLines = linesOf(ROUTE_TWICE);
    const bound    = reqLines.filter((l) => l.msg === 'route log line' || l.msg === 'request completed');
    assert.strictEqual(bound.length, 2);

    for (const line of bound)
    {
      assert.strictEqual(line.vampify_user_id, '1');

      // Count the key in the raw text: a duplicate would be merged away by JSON.parse().
      const occurrences = line.__raw.split('"vampify_user_id"').length - 1;
      assert.strictEqual(occurrences, 1, `vampify_user_id should appear once in: ${line.__raw}`);
    }
  });
});
