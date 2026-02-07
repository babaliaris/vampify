import fp from 'fastify-plugin';
import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import AutoLoad from '@fastify/autoload';
import { join } from 'node:path';
import { registerFastifyEnv } from '@/core/env.js';

export const vampifyApp = fp( async (fastify: FastifyInstance, opts: FastifyPluginOptions) =>
{
  // Load Environment Variables.
  await registerFastifyEnv(fastify);
  
  // Auto-load Plugins
  void fastify.register(AutoLoad, {
    dir: join(import.meta.dirname, 'plugins'),
    options: opts
  });

  // Auto-load Routes
  void fastify.register(AutoLoad, {
    dir: join(import.meta.dirname, 'routes'),
    options: opts
  });

});