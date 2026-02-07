import { FastifyInstance } from 'fastify';
import fastifyEnv from '@fastify/env';
import { join } from 'node:path';
import { Type, Static } from '@sinclair/typebox'

//Define the 
export const EnvSchema = Type.Object(
{
  PORT: Type.Number()
});


export type EnvType = Static<typeof EnvSchema>


const nodeEnv = process.env.NODE_ENV;
const envPath = join(process.cwd(), `.env.${nodeEnv}`);

const options = {
  confKey: 'config', 
  schema: EnvSchema,
  dotenv: {
    path: envPath,
    debug: true
  }
};

export async function registerFastifyEnv(fastify: FastifyInstance)
{
  console.log(`Registering: ${envPath}`);
  await fastify.register(fastifyEnv, options);
}

declare module 'fastify' {
  interface FastifyInstance {
    getEnvs(): EnvType; 
  }
}
