import Fastify, { FastifyPluginAsync } from 'fastify';
import { VampifyInstance } from "./vampify-literals.js";
import { before, after, beforeEach } from 'node:test';
import { vampifyGetLoggerConfig } from './utilities/vampify-logger-config.js';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { sql } from "drizzle-orm";
import dotenv from "dotenv";
import path from 'node:path';


export interface VampifyE2ESuite {
  readonly fastify: VampifyInstance;

  /**
   * Run a Test inside a rolled-back transaction.
   * 
   * This function will execute your test and insure that 
   * the state of the database stays clean after finishing.
   * It will also hot-swap the fastify.db instance with the
   * actual transaction object, in order for your API routes
   * to run in that transaction as well.
   * 
   * @param testBody The function that defines your test
   * @param fk_check True by default. If false, then foreign key checks are disabled.
   */
  runInTransaction(testBody: (fastify: VampifyInstance) => Promise<void>, fk_check?: boolean): Promise<void>;
}


/**
 * Create a Fastify Instance and return it.
 * 
 * This function will register the app entry point to a new
 * fastify instance and return it.
 * 
 * @param vampifyApp The vampify plugin function.
 */
async function vampifyBoot(vampifyApp: any, mock_routes?: FastifyPluginAsync): Promise<VampifyInstance>
{
  // Read environment variables.
  dotenv.config({
    path  : path.join(process.cwd(), ".env.test"),
    debug : false
  });

  // Create the fastify instance.
  const fastify = Fastify(
  {
    logger                : vampifyGetLoggerConfig(),
    forceCloseConnections : false
  }).withTypeProvider<TypeBoxTypeProvider>();

  // Register the main application logic (Entry Point).
  await fastify.register(vampifyApp);

  // Register mock routes.
  if (mock_routes) await fastify.register(mock_routes);
  
  // Wait for all plugins to load (important for Drizzle/Auth/etc.)
  await fastify.ready();

  return fastify;
}




/**
 * Setup an end to end test suite (Single file describe block).
 * 
 * Use this inside an .e2e.ts file with a SINGLE describe() block!!!
 * This will setup the test suite with the following features:
 *     1. Boot up the fastify instances and returning through a getter.
 *     2. Return the runInTransaction(()=>{}) function to be used inside tests.
 *     3. Hot Swap fastify.db with the current transaction.
 * 
 * This way, everytime you or a route is using fastify.db, we garantee that
 * every single query is running inside the current transaction!
 * 
 * Then at the end of this scope, the transaction is rolled back, to clean
 * the database.
 * 
 * THIS ASSUMES THAT EACH TEST IN THE DESCRIBE() BLOCK RUNS LINEARLY AND NOT
 * IN PARALLEL. DO NOT USE: test('...', { concurrency: true })
 * 
 * @returns An object that contains the runInTransaction() and fastify instance.
 */
export function vampifySetupE2E(vampifyApp: any, mock_routes?: FastifyPluginAsync): VampifyE2ESuite
{
  let fastify : VampifyInstance;
  let stockDB : any = null;

  before(async () =>
  {
    fastify = await vampifyBoot(vampifyApp, mock_routes);
  });

  after(async () =>
  {
    if (fastify) await fastify.close();
  });

  beforeEach(() =>
  {
    // If stockDB is not null, the final block did not run.
    // inside a runInTransaction() call. This makes sure to
    // restore the dirty fastify.db instance and testErr variable.
    if (stockDB)
    {
      fastify.db  = stockDB;
      stockDB     = null;
    }
  });


  return {

    // Get the fastify instance.
    get fastify(): VampifyInstance
    {
      if (!fastify)
      {
        throw new Error("Vampify: Fastify instance accessed before boot! Ensure you are calling this inside a test().");
      }
      return fastify;
    },

    // Test Wrapper (Wraps the test in a transaction).
    async runInTransaction(testBody: (fastify: VampifyInstance) => Promise<void>, fk_check: boolean = true)
    {
      // Save the real (stock) database object.
      stockDB = fastify.db;

      try
      {
        await fastify.db.transaction(async (tx) =>
        {
          fastify.db  = tx; // The "Hot Swap".

          if (!fk_check) await tx.execute(sql`SET FOREIGN_KEY_CHECKS = 0;`)
          await testBody(fastify);
          if (!fk_check) await tx.execute(sql`SET FOREIGN_KEY_CHECKS = 1;`)
          
          // Force the transaction to rollback if testBody() does not throw an error.
          throw Error("VampifyCleanRollback");
        });
      }

      catch (err: any)
      {
        if (err.message === "VampifyCleanRollback") return;

        if (err.message === 'Rollback') return;

        // If the error is not an intentianal rollback, re-throw it for the tests to fail!
        throw err;
      }

      finally
      {
        fastify.db  = stockDB;
        stockDB     = null;
      }
    }
  };
}
