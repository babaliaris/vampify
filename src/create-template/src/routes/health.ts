import { FastifyPluginAsync } from "fastify";
import {VampifyInstance} from "@vampify/literals";
import { sql } from "drizzle-orm";
import { ROUTE_ENDPOINTS } from  "../literals.js"
import os from 'os';
import fs from 'fs';
import path from 'path';
import { Type } from "@sinclair/typebox";


// Read the package.json into an object.
const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));


const health: FastifyPluginAsync = async (fastify: VampifyInstance): Promise<void> =>
{
  // TODO: This endpoint SHOULD BE GUARDED.
  // ADD YOUR OWN GUARD LIKE requireRole('ADMIN')
  fastify.get(ROUTE_ENDPOINTS.HEALTH.ROOT,
  {
    schema:
    {
      summary : "Get the health of the server",
      tags    : ["General"],
      response:
      {
        200: Type.Object(
        {
          description   : Type.String(),
          version       : Type.String(),
          node_version  : Type.String(),
          platform      : Type.String(),
          memory        : Type.Object(
          {
            rss         : Type.String(),
            heapTotal   : Type.String()
          }),
          run_mode      : Type.String(),
          status        : Type.String(),
          uptime_seconds: Type.Number(),
          timestamp     : Type.String(),
          db_status     : Type.String(),
          cpu_usage_avg : Type.Array(Type.Number())
        }),

        503: Type.Object(
        {
          description   : Type.String(),
          version       : Type.String(),
          node_version  : Type.String(),
          platform      : Type.String(),
          memory        : Type.Object(
          {
            rss         : Type.String(),
            heapTotal   : Type.String()
          }),
          run_mode      : Type.String(),
          status        : Type.String(),
          uptime_seconds: Type.Number(),
          timestamp     : Type.String(),
          db_status     : Type.String(),
          cpu_usage_avg : Type.Array(Type.Number())
        })
      }
    }
  },
  async (request, reply) =>
  {
    let dbStatus = 'failed';

    const mem           = process.memoryUsage();
    const formatMemory  = (bytes: number) => `${Math.round(bytes / 1024 / 1024 * 100) / 100} MB`;

    try
    {
      await fastify.db.execute(sql`SELECT 1`);
      dbStatus = 'ok';
    }

    catch (error)
    {
      fastify.log.error(error);
      dbStatus = 'unreachable';
    }

    return reply.status(dbStatus === 'ok' ? 200 : 503).send(
    {
      description   : "Accounting Student Backend",
      version       : pkg.version,
      node_version  : process.version,
      platform      : os.platform(),
      memory        :
      {
        rss         : formatMemory(mem.rss),
        heapTotal   : formatMemory(mem.heapTotal)
      },
      run_mode      : fastify.getEnvs().RUN_MODE,
      status        : dbStatus === 'ok' ? 'ok' : 'unhealthy',
      uptime_seconds: Math.floor(process.uptime()),
      timestamp     : new Date().toISOString(),
      db_status     : dbStatus,
      cpu_usage_avg : os.loadavg() // [1min, 5min, 15min] system load
    });
  });
};

export default health;

