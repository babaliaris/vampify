import { FastifyInstance } from 'fastify';
import fastifyEnv from '@fastify/env';
import { join } from 'node:path';
import { Type, Static } from '@sinclair/typebox'

//Define the 
export const EnvSchema = Type.Object(
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

export type EnvType = Static<typeof EnvSchema>

const nodeEnv = process.env.NODE_ENV;
const envPath = join(process.cwd(), `.env.${nodeEnv}`);


export async function registerFastifyEnv(fastify: FastifyInstance)
{
  fastify.log.info(`Registering: ${envPath}`);

  //Register @fastify/env
  await fastify.register(fastifyEnv, {
    schema: EnvSchema,
    dotenv: {
      path: envPath,
      debug: true
    }
  });
}

declare module 'fastify' {
  interface FastifyInstance {
    getEnvs(): EnvType; 
  }
}
