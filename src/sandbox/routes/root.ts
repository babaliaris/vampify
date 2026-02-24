import { FastifyPluginAsync } from "fastify";
import { VampifyInstance } from "@/core/vampify-literals.js";
import { ROUTE_ENDPOINTS } from "../literals.js";

const root: FastifyPluginAsync = async (fastify: VampifyInstance): Promise<void> =>
{
  fastify.get(ROUTE_ENDPOINTS.ROOT.ROOT, async (request, reply) =>
  {
    fastify.db
    reply.send(`PORT: ${JSON.stringify(fastify.getEnvs().SERVER_PORT)}`);
  });
};

export default root;
