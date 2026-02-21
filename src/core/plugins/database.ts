import fp from "fastify-plugin";
import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";
import mysql from "mysql2/promise";
import { FastifyPluginOptions } from "fastify";
import { VampifyInstance } from "../vampify-literals.js";

export type DatabasePluginOptions = {
  schema: Record<string, unknown>
} & FastifyPluginOptions;


/**
 * Vampify database plugin (drizzle orm).
 */
const vampifyDatabasePlugin = fp(async (fastify: VampifyInstance, opt: DatabasePluginOptions) =>
{
  // Create the MYSQL connection pool.
  const pool = mysql.createPool({
    host              : fastify.getEnvs().DB_HOST,
    user              : fastify.getEnvs().DB_USER,
    password          : fastify.getEnvs().DB_PASS,
    database          : fastify.getEnvs().DB_NAME,
    connectionLimit   : fastify.getEnvs().DB_LIMIT,
    debug             : fastify.getEnvs().DB_DEBUG && fastify.vampifyIsDevMode(),
    dateStrings       : true,
    bigNumberStrings  : true
  });

  // Initialize Drizzle
  const db = drizzle(pool, { schema: opt.schema, mode: "default"});

  // Decorate fastify with the Drizzle instance.
  fastify.decorate("db", db as any);

  // Clean up on close.
  fastify.addHook("onClose", async (instance) =>
  {
    instance.log.info("Closing Database connection pool...");
    await pool.end();
  });

  // Check if the connection was enstablished on server startup.
  // Else, let the server crash.
  fastify.addHook('onReady', async () =>
  {
    await db.execute(sql`SELECT 1`);
    fastify.log.info('Database connection verified!');
  });

});

export default vampifyDatabasePlugin;
