import fp from 'fastify-plugin';
import {
  FastifyInstance,
  FastifyPluginOptions}
  from 'fastify';

import fastifySensible from "@fastify/sensible";
import vampifyEnvPlugin from './plugins/environment.js';
import vampifyDatabasePlugin from './plugins/database.js';
import vampifyAuthenticationPlugin from './plugins/auth.js';

export type VampifyPluginOptions = {
  schema: Record<string, unknown>
} & FastifyPluginOptions;

export const vampifyPlugin = fp( async (fastify: FastifyInstance, opts: VampifyPluginOptions) =>
{
  // Load Environment Variables.
  await fastify.register(vampifyEnvPlugin);

  // Register Database.
  await fastify.register(vampifyDatabasePlugin, {schema: opts.schema});

  // Register Sensible.
  await fastify.register(fastifySensible);

  // Register authentication plugin.
  await fastify.register(vampifyAuthenticationPlugin);

});
