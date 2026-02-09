import fp from "fastify-plugin";
import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import fastifyEnv from '@fastify/env';
import { join } from 'node:path';
import { Type, Static } from '@sinclair/typebox'

//Define the Schema.
export const VampifyEnvSchema = Type.Object(
{
  SERVER_PORT: Type.Number(),
  DB_URL: Type.String(),
  DB_HOST: Type.String(),
  DB_USER: Type.String(),
  DB_PASS: Type.String(),
  DB_NAME: Type.String(),
  DB_LIMIT: Type.Integer(),
  DB_DEBUG: Type.Boolean()
});

// Convert the Schema to a typscript object.
export type VampifyEnvType = Static<typeof VampifyEnvSchema>

// Plugin Options.
export type VampifyEnvOptions = {

} & FastifyPluginOptions;

// Get NODE_ENV and the full path of the .env relative to the root.
const nodeEnv = process.env.NODE_ENV;
const envPath = join(process.cwd(), `.env.${nodeEnv}`);

/**
 * Vampify environment variables loader plugin.
 */
const vampifyEnvPlugin = fp(async (fastify: FastifyInstance, opts: VampifyEnvOptions) => 
{
  fastify.log.info(`Registering: ${envPath}`);

  //Register @fastify/env
  await fastify.register(fastifyEnv, {
    schema: VampifyEnvSchema,
    dotenv: {
      path: envPath,
      debug: true
    }
  });
});


declare module 'fastify' {
  interface FastifyInstance {
    getEnvs(): VampifyEnvType; 
  }
}

export default vampifyEnvPlugin;
