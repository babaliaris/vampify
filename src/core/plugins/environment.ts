import fp from "fastify-plugin";
import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import fastifyEnv from '@fastify/env';
import { join } from 'node:path';
import { Type, Static } from '@sinclair/typebox'

//Define the Schema.
export const VampifyEnvSchema = Type.Object(
{
  DB_URL: Type.String(),
  DB_HOST: Type.String(),
  DB_USER: Type.String(),
  DB_PASS: Type.String(),
  DB_NAME: Type.String(),
  DB_LIMIT: Type.Integer(),
  DB_DEBUG: Type.Boolean(),
  JWT_SECRET: Type.String(),
  JWT_EXPIRES: Type.Integer(),

  RUN_MODE: Type.String(),
  LOGGING: Type.Boolean(),
  LOG_METHOD: Type.String(),
  SERVER_PORT: Type.Number()
});

// Convert the Schema to a typscript object.
type VampifyEnvType = Static<typeof VampifyEnvSchema>

// Create a raw type as well, that everything is a string.
type VampifyRawEnv = {
  [K in keyof VampifyEnvType]: string;
};

// Environment Literals.
export const VAMPIFY_ENV_LITERALS = {
  RUN_MODE_DEV      : "development",
  RUN_MODE_PROD     : "production",
  RUN_MODE_TEST     : "test",
  LOG_METHOD_PRETTY : "pretty",
  LOG_METHOD_ROLL   : "roll",
  LOG_METHOD_STDOUT : "stdout",
  TRUE              : "true",
  FALSE             : "false"
};

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
  if (process.env.NODE_ENV === VAMPIFY_ENV_LITERALS.RUN_MODE_PROD)
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
  if (process.env.NODE_ENV === VAMPIFY_ENV_LITERALS.RUN_MODE_DEV)
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
  if (process.env.NODE_ENV === VAMPIFY_ENV_LITERALS.RUN_MODE_TEST)
    return true;

  return false;
}

/**
 * Vampify environment variables loader plugin.
 */
const vampifyEnvPlugin = fp(async (fastify: FastifyInstance, opts: VampifyEnvOptions) => 
{
  fastify.log.info(`Env Load Path: ${envPath}`);

  // Decorate the mode checker functions.
  fastify.decorate("vampifyIsProdMode", vampifyIsProdMode);
  fastify.decorate("vampifyIsDevMode", vampifyIsDevMode);
  fastify.decorate("vampifyIsTestMode", vampifyIsTestMode);

  //Register @fastify/env
  await fastify.register(fastifyEnv, {
    schema: VampifyEnvSchema,
    dotenv: false, // dotenv runs at server.ts
    data  : process.env
  });
});


declare module 'fastify' {
  interface FastifyInstance {

    /**
   * Environment Variables Getter.
   * 
   * Get the environment variables.
   * 
   * @returns The environment variables object.
   */
    getEnvs(): VampifyEnvType;

    /**
   * Production Mode.
   * 
   * Checks if the process is run in production mode.
   * 
   * @returns true if in Production Mode.
   */
    vampifyIsProdMode(): boolean;

    /**
   * Development Mode.
   * 
   * Checks if the process is run in development mode.
   * 
   * @returns true if in Development Mode.
   */
    vampifyIsDevMode(): boolean;

    /**
   * Test Mode.
   * 
   * Checks if the process is run in test mode.
   * 
   * @returns true if in Testing Mode.
   */
    vampifyIsTestMode(): boolean;
  }
}


// Declare globaly the process.env object.
declare global {
  namespace NodeJS {
    // We extend the existing ProcessEnv interface
    interface ProcessEnv extends VampifyRawEnv {}
  }
}

export default vampifyEnvPlugin;
