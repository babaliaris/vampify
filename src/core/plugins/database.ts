import fp from "fastify-plugin";
import { drizzle, MySql2Database } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";
import mysql from "mysql2/promise";
import { FastifyInstance, FastifyPluginOptions } from "fastify";

export type DatabasePluginOptions = {
  schema: Record<string, unknown>
} & FastifyPluginOptions;


/**
 * Vampify database plugin (drizzle orm).
 */
const vampifyDatabasePlugin = fp(async (fastify: FastifyInstance, opt: DatabasePluginOptions) =>
{
  // True if we run in development mode.
  const isDevMode = process.env.NODE_ENV === "development";

  // Create the MYSQL connection pool.
  const pool = mysql.createPool({
    host: fastify.getEnvs().DB_HOST,
    user: fastify.getEnvs().DB_USER,
    password: fastify.getEnvs().DB_PASS,
    database: fastify.getEnvs().DB_NAME,
    connectionLimit: fastify.getEnvs().DB_LIMIT,
    debug: fastify.getEnvs().DB_DEBUG && isDevMode,
    dateStrings: true,
    bigNumberStrings: true
  });

  // Initialize Drizzle
  const db = drizzle(pool, { schema: opt.schema, mode: "default"});

  // Decorate fastify with the Drizzle instance.
  fastify.decorate("db", db as any);

  // Clean up on close.
  fastify.addHook("onClose", async () => {
    await pool.end();
  });

  // Check if the connection was enstablished on server startup.
  // Else, let the server crash.
  fastify.addHook('onReady', async () => {
    await fastify.db.execute(sql`SELECT 1`);
    fastify.log.info('Database connection verified!');
  });

});

export default vampifyDatabasePlugin;
