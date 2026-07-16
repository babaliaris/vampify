import path from "node:path";
import { VAMPIFY_ENV_LITERALS } from '../plugins/environment.js';
import { VAMPIFY_LITERALS } from "../vampify-literals.js";
import { PinoLoggerOptions } from "fastify/types/logger.js";
import {
  FastifyRequest, FastifyLoggerOptions
} from "fastify";
import type {
  LoggerOptions, TransportMultiOptions, TransportSingleOptions
} from "pino";


/**
 * Create and return the logger config.
 */
export function vampifyGetLoggerConfig(): boolean | (FastifyLoggerOptions & LoggerOptions)
{
  // Disable logging entirely
  if (process.env.LOGGING === VAMPIFY_ENV_LITERALS.FALSE) return false;

  // Define the base configuration (Serializers & Redaction)
  const baseConfig: FastifyLoggerOptions & PinoLoggerOptions =
  {
    redact      : ['req.headers.authorization', 'body.password'],
    serializers :
    {
      req(request: FastifyRequest)
      {
        return {
          method        : request.method,
          url           : request.url,
          ip            : request.ip,
          userId        : request.vampify_payload?.user_id || 'guest'
        };
      },

      res(reply)
      {
        return {
          statusCode: reply.statusCode,
        };
      },
    },
  };

  // Handle STDOUT (Standard JSON)
  if (process.env.LOG_METHOD === VAMPIFY_ENV_LITERALS.LOG_METHOD_STDOUT) {
    return baseConfig;
  }

  // Handle Transports (Pretty or Roll)
  let transport: TransportSingleOptions | TransportMultiOptions | undefined;

  // Choose folder name.
  const folder_name = process.env.NODE_ENV === "production"
    ? VAMPIFY_LITERALS.LOGS_DIR_NAME_PROD
    : VAMPIFY_LITERALS.LOGS_DIR_NAME_DEV;

  // PRETTY
  if (process.env.LOG_METHOD === VAMPIFY_ENV_LITERALS.LOG_METHOD_PRETTY)
  {
    transport =
    {
      target  : 'pino-pretty',
      options : { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' },
    };
  }

  // ROTATING FILES
  else if (process.env.LOG_METHOD === VAMPIFY_ENV_LITERALS.LOG_METHOD_ROLL)
  {
    // Create the transport object.
    transport =
    {
      targets:
      [
        {
          target      : 'pino-roll',
          options     :
          {
            file      : path.join(process.cwd(), folder_name, VAMPIFY_LITERALS.LOGS_FILE_BASE_NAME),
            frequency : 'daily',
            dateFormat: 'yyyy-MM-dd',
            size      : '10m',
            mkdir     : true,
            limit     : { count: 30 }
          },
          level       : 'info'
        }
      ]
    };
  }

  // ROTATING FILES + STDOUT
  else if (process.env.LOG_METHOD === VAMPIFY_ENV_LITERALS.LOG_METHOD_ROLL_AND_STDOUT)
  {
    // Create the transport object.
    transport =
    {
      targets:
      [
        {
          target  : 'pino/file',
          options : { destination: 1 }, // 1 is stdout
          level   : 'info'
        },

        {
          target      : 'pino-roll',
          options     :
          {
            file      : path.join(process.cwd(), folder_name, VAMPIFY_LITERALS.LOGS_FILE_BASE_NAME),
            frequency : 'daily',
            dateFormat: 'yyyy-MM-dd',
            size      : '10m',
            mkdir     : true,
            limit     : { count: 30 }
          },
          level       : 'info'
        }
      ]
    };
  }
 
  // UKNOWN, fallback to baseConfig.
  else
  {
    console.warn(`[Fallback Logger]: Unknown value for env variable LOG_METHOD=${process.env.LOG_METHOD}`);
    return baseConfig;
  }

  // Return COMBINED config
  return { ...baseConfig, transport };
}
