import { FastifyPluginAsync } from "fastify";

const root: FastifyPluginAsync = async (fastify, opts): Promise<void> =>
{
  fastify.get('/health', async (request, reply) =>
  {
    const health = {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: Date.now(),
      // You can add more checks here later:
      // db: await checkDbConnection()
    };

    try
    {
      return reply.status(200).send(health);

    }
    
    catch (error)
    {
      return reply.status(503).send({ status: 'unhealthy', reason: error });
    }
  });
};

export default root;
