import Fastify from 'fastify';
import {vampifyApp} from './app.js';
import { VAMPIFY_ENV_LITERALS } from '@vampify/env';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import dotenv from "dotenv";
import path from "node:path";


// Load environment variables.
dotenv.config({
  path  : `${process.cwd()}/.env.${process.env.NODE_ENV}`,
  debug : process.env.NODE_ENV === VAMPIFY_ENV_LITERALS.RUN_MODE_DEV
});


// Create the fastify instance.
const server = Fastify({
  logger: getLoggerConfig()
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



/**
 * Create and return the logger config.
 */
function getLoggerConfig(): any
{
  // Disable logging entirely
  if (process.env.LOGGING === VAMPIFY_ENV_LITERALS.FALSE) return false;

  // STDOUT (Standard JSON)
  if (process.env.LOG_METHOD === VAMPIFY_ENV_LITERALS.LOG_METHOD_STDOUT) return true;

  // Transports (Pretty or Roll)
  let transportConfig;

  // Pino Pretty.
  if (process.env.LOG_METHOD === VAMPIFY_ENV_LITERALS.LOG_METHOD_PRETTY)
  {
    transportConfig = {
      target: 'pino-pretty',
      options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' },
    };

    return { transport: transportConfig };
  }

  // Rotating Files.
  else if (process.env.LOG_METHOD === VAMPIFY_ENV_LITERALS.LOG_METHOD_ROLL)
  {
    transportConfig = {
      target: 'pino-roll',
      options: {
        file: path.join(process.cwd(), 'logs', 'vampify-app.log'),
        frequency: 'daily',
        dateFormat: 'yyyy-MM-dd',
        size: '10m',
        mkdir: true,
        limit: { count: 30 } // 30 files max.
      }
    };

    return { transport: transportConfig };
  }

  console.warn(`[Fallback Logger]: Uknown value for env variable LOG_METHOD=${process.env.LOG_METHOD}`);
  return { transport: transportConfig };
}
