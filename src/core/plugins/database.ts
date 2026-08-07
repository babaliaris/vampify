import fp from "fastify-plugin";
import { drizzle, MySql2Database, MySql2PreparedQueryHKT, MySql2QueryResultHKT } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";
import { MySqlTransaction } from "drizzle-orm/mysql-core";
import mysql from "mysql2/promise";
import { FastifyPluginOptions, FastifyRequest } from "fastify";
import { VampifyInstance } from "../vampify-literals.js";

// The PLUG Options TYPE.
export type DatabasePluginOptions<TSchema extends Record<string, unknown> = Record<string, any>> =
{
  schema: TSchema
} & FastifyPluginOptions;

// Database & transaction TYPES.
export type VampifyDbInstance<TSchema extends Record<string, unknown> = Record<string, unknown>> = MySql2Database<TSchema>;
export type VampifyTxInstance<
  TSchema extends Record<string, unknown> = Record<string, unknown>,
  TQueryResult extends MySql2QueryResultHKT = MySql2QueryResultHKT,
  TPreparedQueryHKT extends MySql2PreparedQueryHKT = MySql2PreparedQueryHKT
> = MySqlTransaction<
  TQueryResult,
  TPreparedQueryHKT,
  TSchema,
  any
>;

/**
  * This function is decorated to the fastify instance and is being used by the user to wrap
  * his DB operations inside a transaction and retry loop in case of a DEADLOCK.
  */
async function runInTransactionRetry<T, TSchema extends Record<string, unknown> = Record<string, any>>(
  req        : FastifyRequest,
  db         : MySql2Database<any>,
  callback   : (tx: MySqlTransaction<any, any, TSchema, any>) => Promise<T>,
  maxRetries = 4
): Promise<T>
{
  // If we are inside the TEST ENVIRONMENT, skip this functionality,
  // because we want to expose deadlocks.
  if ( (db as any).__is_vampify_test_transaction__ === true )
  {
    return await callback(db as any);
  }

  // Retry LOOP.
  for (let attempt = 0; attempt < maxRetries; attempt++)
  {
    // Try to run the callback inside a transaction.
    try
    {
      return await db.transaction(async (tx) =>
      {
        return await callback(tx as any);
      });
    }

    // If an error occurs and that error is a DEADLOCK,
    // re-run the functionality.
    catch (err: any)
    {
      const isDeadlock = err.code === 'ER_LOCK_DEADLOCK' || err.cause?.code === 'ER_LOCK_DEADLOCK';

      // If the error is a DEADLOCK and we have NOT exhausted the retries.
      if (isDeadlock && attempt < maxRetries - 1)
      {
        req.log.warn(
          { error: err, current_try: attempt, max_attempts: maxRetries },
          "Database transaction DEADLOCK encountered. Retrying..."
        );

        // Wait x amount of milliseconds and then retry.
        await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)));
        continue;
      }

      throw err;
    }
  }

  throw new Error("Transaction failed after maximum deadlock retries");
}




/**
 * Vampify database plugin (drizzle orm).
 */
const vampifyDatabasePlugin = fp(async <TSchema extends Record<string, unknown>>
  (fastify: VampifyInstance, opt: DatabasePluginOptions<TSchema>) =>
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
    bigNumberStrings  : true,
    waitForConnections: true,    // If all 10 pipes are busy, wait for one to open
    queueLimit        : 0,       // 0 means no limit to the queue (safer for spikes)
    idleTimeout       : 60000,   // Close idle connections after 60 seconds
  });

  // Initialize Drizzle
  const db = drizzle(pool, { schema: opt.schema, mode: "default"});

  // Decorate fastify with the Drizzle instance.
  fastify.decorate("db", db as any);

  // Decorate fastify.
  fastify.decorateRequest("runInTransactionRetry", async function <T>(
    this       : FastifyRequest,
    callback   : (tx: VampifyTxInstance) => Promise<T>,
    maxRetries = 4
  )
  {
    return runInTransactionRetry(this, this.server.db, callback, maxRetries);
  });

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




declare module "fastify"
{
  interface FastifyRequest
  {
    /**
      * Runs your callback functionality through
      * a drizzle transaction and retries if there
      * a deadlock occurs.
      *
      * @param callback The function that contains your db operations.
      * @param maxRetries The maximumm number of retries. Default is 4.
      *
      * @returns The transaction result object.
      */
    runInTransactionRetry<
      T,
      TSchema extends Record<string, unknown> = Record<string, unknown>,
      TQueryResult extends MySql2QueryResultHKT = MySql2QueryResultHKT,
      TPreparedQueryHKT extends MySql2PreparedQueryHKT = MySql2PreparedQueryHKT
    >(
      callback: (tx: VampifyTxInstance<TSchema, TQueryResult, TPreparedQueryHKT> ) => Promise<T>,
      maxRetries?: number
    ): Promise<T>;
  }
}

export default vampifyDatabasePlugin;
