import path from "node:path";
import { VAMPIFY_ENV_LITERALS } from '../plugins/environment.js';
import { FastifyRequest, FastifyReply } from "fastify";


/**
 * Create and return the logger config.
 */
export function vampifyGetLoggerConfig(): any 
{
  // Disable logging entirely
  if (process.env.LOGGING === VAMPIFY_ENV_LITERALS.FALSE) return false;

  // Define the base configuration (Serializers & Redaction)
  const baseConfig =
  {
    redact: ['req.headers.authorization', 'body.password'],
    serializers:
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

      res(reply: FastifyReply)
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
  let transport;

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
    transport =
    {
      target      : 'pino-roll',
      options     : {
        file      : path.join(process.cwd(), 'logs', 'vampify-app.log'),
        frequency : 'daily',
        dateFormat: 'yyyy-MM-dd',
        size      : '10m',
        mkdir     : true,
        limit     : { count: 30 }
      }
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
