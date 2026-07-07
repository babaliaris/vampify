import { QueryError } from 'mysql2';
import { VampifyInstance } from '../vampify-literals.js';
import { VAMPIFY_ENV_LITERALS } from '../plugins/environment.js';

import {
  FastifyError,
  FastifyRequest,
  FastifyReply
  }
  from 'fastify';

/**
 * Extend the base QueryError to include the optional SQL string
 * that the driver attaches at runtime.
 */
interface MySqlDriverError extends QueryError
{
  sql?: string;
}

function isDatabaseError(error: unknown): error is MySqlDriverError
{
  // Check the error itself OR its cause (Drizzle wraps the driver error)
  const target = (error && typeof error === 'object' && 'cause' in error) 
    ? (error as any).cause 
    : error;

  return (
    target !== null && typeof target === 'object' &&
    'code' in target && 'errno' in target
  );
}




export function vampifyInitializeErrorHandling(fastify: VampifyInstance)
{
  // Use fastify.log if the instance is still alive
  const handleFatal = (reason: unknown, promise: Promise<unknown>) =>
  {
    // Log using the fastify logger.
    if (fastify) fastify.log.fatal({ promise, reason }, 'VAMPIFY CRITICAL: Unhandled Rejection');

    // Force logging to the console, if in TEST or DEV mode.
    if (process.env.NODE_ENV === VAMPIFY_ENV_LITERALS.RUN_MODE_DEV || 
        process.env.NODE_ENV === VAMPIFY_ENV_LITERALS.RUN_MODE_TEST)
    {
        console.error('\n' + '='.repeat(50));
        console.error('VAMPIFY CRITICAL: UNHANDLED REJECTION');
        console.error('This usually means you forgot to "await" an async function.');
        console.error('-'.repeat(50));
        console.error('Reason:', reason instanceof Error ? reason.stack : reason);
        console.error('='.repeat(50) + '\n');
    }

    process.exit(1);
  };

  // Set the Fatal Handler ONLY ONCE, since this code will run multiple times in the same process!
  if (process.listenerCount('unhandledRejection') === 0)
  {
    process.on('unhandledRejection', handleFatal);
  }


  // Set Fastify Global Error Handler.
  fastify.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) =>
  {
    const dbError         = error.cause && isDatabaseError(error.cause) ? error.cause : error;
    const isDebuggable    = fastify.vampifyIsDevMode() || fastify.vampifyIsTestMode();

    // Handle Validation Errors (TypeBox/Ajv)
    if (error.validation)
    {
      return reply.status(400).send(
      {
        statusCode: 400,
        error     : 'Bad Request',
        message   : 'The data provided is invalid.',
        reqId     : request.id,
        details   : error.validation
      });
    }


    // Handle Database Errors (MariaDB/MySQL)
    if (isDatabaseError(dbError))
    {
      // Log a warning, to know that database errors are happening during production.
      request.log.warn({ dbCode: dbError.code, sql: dbError.sql }, 'Database Error Intercepted');

      switch (dbError.code)
      {
        case 'ER_DUP_ENTRY':
          return reply.status(409).send(
          {
            statusCode: 409,
            error     : 'Conflict',
            message   : 'This record already exists.',
            reqId     : request.id,
            details   : isDebuggable ? error.message : ""
          });

        case 'ER_NO_REFERENCED_ROW_2':
        case 'ER_NO_REFERENCED_ROW':
          return reply.status(400).send(
          {
            statusCode: 400,
            error     : 'Bad Request',
            message   : 'Related record not found.',
            reqId     : request.id,
            details   : isDebuggable ? error.message : ""
          });

        case 'ER_DATA_TOO_LONG':
          return reply.status(400).send(
          {
            statusCode: 400,
            error     : 'Bad Request',
            message   : 'Value is too long for the database field.',
            reqId     : request.id,
            details   : isDebuggable ? error.message : ""
          });

        case 'ER_WARN_DATA_OUT_OF_RANGE':
          return reply.status(400).send(
          {
            statusCode: 400,
            error     : 'Bad Request',
            message   : 'Numeric value is out of range.',
            reqId     : request.id,
            details   : isDebuggable ? error.message : ""
          });
      }
    }

    // Handle Explicit HTTP Errors (e.g., throw fastify.httpErrors.notFound())
    // These already have a statusCode attached from @fastify/sensible.
    if (error.statusCode && error.statusCode < 500)
    {
      request.log.error(error, `[HTTP ERROR]: ${error.message}`);

      return reply.status(error.statusCode).send(
      {
        statusCode: error.statusCode,
        error     : error.name,
        message   : error.message,
        reqId     : request.id,
        details   : isDebuggable ? ((error as any).details || undefined) : undefined
      });
    }

    // Unhandled Exceptions (500 Internel Server Errors)

    // Log the error.
    request.log.error(error, `[INTERNAL SERVER ERROR]: ${error.message}`);

    // Return the error to the response.
    return reply.status(error.statusCode || 500).send(
    {
      statusCode: error.statusCode || 500,
      error     : 'Internal Server Error',
      message   : isDebuggable ? error.message  : 'Internal Server Error',
      reqId     : request.id,
      stack     : isDebuggable ? error.stack    : {},
      details   : isDebuggable ? ((error as any).details || undefined) : undefined
    });
  });
}
