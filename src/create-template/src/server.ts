import Fastify from 'fastify';
import {vampifyApp} from './app.js';

// Create the Fastify Instance.
const server = Fastify(
{
  logger: process.env.NODE_ENV === 'development' ? {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  } : true // use JSON in production.
});


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

vampifyServerStart();
