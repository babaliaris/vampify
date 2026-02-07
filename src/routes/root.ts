import { FastifyPluginAsync } from "fastify";

const root: FastifyPluginAsync = async (fastify, opts): Promise<void> =>
{
  fastify.get("/", async (request, reply) =>
  {
    reply.send(`PORT: ${JSON.stringify(fastify.getEnvs().PORT)}`);
  });
};

export default root;
