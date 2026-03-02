import Fastify from 'fastify';
import {vampifyApp} from './app.js';
import { VAMPIFY_ENV_LITERALS } from '@vampify/env';
import { vampifyGetLoggerConfig } from '@vampify/utils';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import dotenv from "dotenv";


// Load environment variables.
dotenv.config(
{
  path  : `${process.cwd()}/.env.${process.env.NODE_ENV}`,
  debug : process.env.NODE_ENV === VAMPIFY_ENV_LITERALS.RUN_MODE_DEV
});


// Create the fastify instance.
const server = Fastify(
{
  logger    : vampifyGetLoggerConfig(),
  trustProxy: true
}).withTypeProvider<TypeBoxTypeProvider>();



// Handle Shutdown.
const vampifyServerShutdown = async (signal: string) =>
{
  server.log.info(`Received ${signal}. Graceful shutdown...`);

  await server.close();

  process.exit(0);
};


// Server Entry Point.
async function vampifyServerStart()
{
  try
  {
    await server.register(vampifyApp);
    await server.ready();
    await server.listen({ port: server.getEnvs().SERVER_PORT, host: '0.0.0.0' });

    process.on('SIGINT', () => vampifyServerShutdown('SIGINT'));
    process.on('SIGTERM', () => vampifyServerShutdown('SIGTERM'));
  }

  catch (err)
  {
    server.log.error(err);
    process.exit(1);
  }
}


//START THE SERVER!!!
await vampifyServerStart();
