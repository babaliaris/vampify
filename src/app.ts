import fp from 'fastify-plugin';
import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import AutoLoad from '@fastify/autoload';
import { join } from 'node:path';
import { MySql2Database } from 'drizzle-orm/mysql2';

import { vampifyPlugin } from './core/vampify.js';

import * as schema from "@/db/schema.js";

export const vampifyApp = fp( async (fastify: FastifyInstance, opts: FastifyPluginOptions) =>
{
  // Register the vampify plugin.
  fastify.register(vampifyPlugin, {schema: schema});

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


// Extend the Fastify type system for the database schema.
declare module 'fastify' {
  interface FastifyInstance {
    db: MySql2Database<typeof schema>;
  }
}
