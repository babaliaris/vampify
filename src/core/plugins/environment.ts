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
  DB_DEBUG: Type.Boolean(),
  JWT_SECRET: Type.String()
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
 * Production Mode.
 * 
 * Checks if the process is run in production mode.
 * 
 * @returns true if in Production Mode.
 */
export function vampifyIsProdMode(): boolean
{
  if (process.env.NODE_ENV === "production")
    return true;

  return false;
}


/**
 * Development Mode.
 * 
 * Checks if the process is run in development mode.
 * 
 * @returns true if in Development Mode.
 */
export function vampifyIsDevMode(): boolean
{
  if (process.env.NODE_ENV === "development")
    return true;

  return false;
}


/**
 * Test Mode.
 * 
 * Checks if the process is run in test mode.
 * 
 * @returns true if in Testing Mode.
 */
export function vampifyIsTestMode(): boolean
{
  if (process.env.NODE_ENV !== "development" && process.env.NODE_ENV !== "production")
    return true;

  return false;
}

/**
 * Vampify environment variables loader plugin.
 */
const vampifyEnvPlugin = fp(async (fastify: FastifyInstance, opts: VampifyEnvOptions) => 
{
  fastify.log.info(`Registering: ${envPath}`);

  // Decorate the mode checker functions.
  fastify.decorate("isProdMode", vampifyIsProdMode);
  fastify.decorate("isDevMode", vampifyIsDevMode);
  fastify.decorate("isTestMode", vampifyIsTestMode);

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

    /**
   * Production Mode.
   * 
   * Checks if the process is run in production mode.
   * 
   * @returns true if in Production Mode.
   */
    isProdMode(): boolean;

    /**
   * Development Mode.
   * 
   * Checks if the process is run in development mode.
   * 
   * @returns true if in Development Mode.
   */
    isDevMode(): boolean;

    /**
   * Test Mode.
   * 
   * Checks if the process is run in test mode.
   * 
   * @returns true if in Testing Mode.
   */
    isTestMode(): boolean;
  }
}

export default vampifyEnvPlugin;
