import Fastify, {FastifyInstance} from 'fastify';
import { before, after, beforeEach } from 'node:test';
import dotenv from "dotenv";
import path from 'node:path';


export interface VampifyE2ESuite {
  readonly fastify: FastifyInstance;
  runInTransaction(testBody: (fastify: FastifyInstance) => Promise<void>): Promise<void>;
}


/**
 * Create a Fastify Instance and return it.
 * 
 * This function will register the app entry point to a new
 * fastify instance and return it.
 * 
 * @param vampifyApp The vampify plugin function.
 */
async function vampifyBoot(vampifyApp: any): Promise<FastifyInstance>
{
  // Read environment variables.
  dotenv.config({
    path  : path.join(process.cwd(), ".env.test"),
    debug : true
  });

  // Create the fastify instance.
  const fastify = Fastify(
    {
      logger: process.env.LOGGING === "true" ? {
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    } : false, // Disable logging.

    forceCloseConnections: true
  });

  // Register the main application logic (Entry Point).
  await fastify.register(vampifyApp);
  
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
export function vampifySetupE2E(vampifyApp: any): VampifyE2ESuite
{
  let fastify : FastifyInstance;
  let stockDB : any = null;
  let testErr : any = null;

  before(async () =>
  {
    fastify = await vampifyBoot(vampifyApp);
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
      testErr     = null;
    }
  });


  return {

    // Get the fastify instance.
    get fastify(): FastifyInstance
    {
      if (!fastify)
      {
        throw new Error("Vampify: Fastify instance accessed before boot! Ensure you are calling this inside a test().");
      }
      return fastify;
    },

    // Test Wrapper (Wraps the test in a transaction).
    async runInTransaction(testBody: (fastify: FastifyInstance) => Promise<void>)
    {
      // Save the real (stock) database object.
      stockDB = fastify.db;

      try
      {
        await fastify.db.transaction(async (tx) =>
        {
          fastify.db  = tx; // The "Hot Swap".

          try
          {
            await testBody(fastify);
          }

          catch(err: any)
          {
            testErr = err;
            throw err;
          }

          finally
          {
            tx.rollback();
          }
        });
      }

      catch (err: any)
      {
        // Throw the captured test error if it exists.
        if (testErr) throw testErr;

        // Drizzle uses a specific internal error for rollbacks.
        // If its not a rollback error, re-throw the error.
        if (err.message !== 'Rollback') throw err;
      }

      finally
      {
        fastify.db  = stockDB;
        stockDB     = null;
        testErr     = null;
      }
    }
  };
}
