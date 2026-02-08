import fp from "fastify-plugin";
import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";
import mysql from "mysql2/promise";
import * as schema from "../db/schema.js";
import { FastifyInstance, FastifyPluginOptions } from "fastify";

export default fp(async (fastify: FastifyInstance, opt: FastifyPluginOptions) =>
{
  // Create the MYSQL connection pool.
  const pool = mysql.createPool({
    host: fastify.getEnvs().DB_HOST,
    user: fastify.getEnvs().DB_USER,
    password: fastify.getEnvs().DB_PASS,
    database: fastify.getEnvs().DB_NAME,
    connectionLimit: fastify.getEnvs().DB_LIMIT,
    debug: fastify.getEnvs().DB_DEBUG,
    dateStrings: true,
    bigNumberStrings: true
  });

  // Initialize Drizzle
  const db = drizzle(pool, { schema, mode: "default" });

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

// Extend the Fastify type system.
declare module 'fastify' {
  interface FastifyInstance {
    db: ReturnType<typeof drizzle<typeof schema>>;
  }
}
