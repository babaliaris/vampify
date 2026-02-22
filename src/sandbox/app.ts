import { FastifyPluginOptions } from 'fastify';
import { VampifyInstance } from "@vampify/literals";
import fp from 'fastify-plugin';
import AutoLoad from '@fastify/autoload';
import { join } from 'node:path';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { vampifyPlugin } from '@vampify/core';
import * as schema from "./db/schema.js";

export const vampifyApp = fp( async (fastify: VampifyInstance, opts: FastifyPluginOptions) =>
{
  // Register the vampify plugin.
  fastify.register(vampifyPlugin, {schema: schema});

  // Auto-load Plugins
  void fastify.register(AutoLoad, {
    dir     : join(import.meta.dirname, 'plugins'),
    options : opts
  });

  // Auto-load Routes
  void fastify.register(AutoLoad, {
    dir               : join(import.meta.dirname, 'routes'),
    options           : opts,
    routeParams       : false,
    cascadeHooks      : true,
    dirNameRoutePrefix: false
  });

});

// Extend the Fastify type system.
declare module 'fastify' {
  interface FastifyInstance {
    db: MySql2Database<typeof schema>;
  }
}
