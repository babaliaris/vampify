import { FastifyPluginAsync } from "fastify";

const root: FastifyPluginAsync = async (fastify, opts): Promise<void> =>
{
  fastify.get("/", async (request, reply) =>
  {
    fastify.db
    reply.send(`PORT: ${JSON.stringify(fastify.getEnvs().SERVER_PORT)}`);
  });
};

export default root;
