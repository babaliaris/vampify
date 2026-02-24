import { FastifyPluginAsync } from "fastify";
import { VampifyInstance } from "@/core/vampify-literals.js";
import { sql } from "drizzle-orm";
import { ROUTE_ENDPOINTS } from "../literals.js";

const root: FastifyPluginAsync = async (fastify: VampifyInstance): Promise<void> =>
{
  fastify.get(ROUTE_ENDPOINTS.HEALTH.ROOT, async (request, reply) =>
  {
    let dbStatus = 'failed';

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

    const health = {
      status          : dbStatus === 'ok' ? 'ok' : 'unhealthy',
      uptime_seconds  : Math.floor(process.uptime()),
      timestamp       : new Date().toISOString(),
      db              : dbStatus
    };

    const statusCode = health.status === 'ok' ? 200 : 503;

    return reply.status(statusCode).send(health);
  });
};

export default root;
