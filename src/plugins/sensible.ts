import fp from "fastify-plugin";
import { FastifyInstance, FastifyPluginOptions } from "fastify";
import fastifySensible from "@fastify/sensible";

/**
 * @fastify/sensible defaults for easy error handling
 * see https://github.com/fastify/fastify-sensible
 */
export default fp(async (fastify: FastifyInstance, opts: FastifyPluginOptions) =>
{
  // Register the plugin
  await fastify.register(fastifySensible, {
    // You can add options here, like sharedSchemaId: 'HttpError'
  });
});
