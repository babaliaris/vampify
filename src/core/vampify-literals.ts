import {
  FastifyInstance,
  FastifyBaseLogger,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerDefault  } from 'fastify';

import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { Type } from "@sinclair/typebox";

export const VAMPIFY_LITERALS = {
    PAYLOAD_COOKIE_NAME : "VAMPIFY_PAYLOAD_COOKIE",
    X_NATIVE_DEVICE_ID  : "x-vampify-device-id",
    X_SERVICE_API_KEY   : "x-service-api-key",
    LOGS_DIR_NAME_PROD  : "logs",
    LOGS_DIR_NAME_DEV   : "logs-dev",
    LOGS_FILE_BASE_NAME : "vampify-app.log"
} as const;

export type VampifyInstance = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  FastifyBaseLogger,
  TypeBoxTypeProvider
>;



export const VAMPIFY_DEBUG_MSG =
{
    REASON:
    {
        // Success (status < 400)
        SUCCESS                 : "SUCCESS", //200
        CONTENT_CREATED         : "CONTENT_CREATED", //201
        NO_CONTENT              : "NO_CONTENT", //204

        // Warnings (status >= 400)
        BAD_REQUEST             : "BAD_REQUEST", //400
        UNAUTHORIZED            : "UNAUTHORIZED", //401
        FORBIDDEN               : "FORBIDDEN", //403
        NOT_FOUND               : "NOT_FOUND", //404
        CONFLICT                : "CONFLICT", //409
        PAYLOAD_TOO_LARGE       : "PAYLOAD_TOO_LARGE", //413
        VALIDATION_FAILED       : "VALIDATION_FAILED", //422
        TOO_MANY_REQUESTS       : "TOO_MANY_REQUESTS", //429

        // Errors (status >= 500)
        INTERNAL_SERVER_ERROR   : "INTERNAL_SERVER_ERROR", //500
        SERVICE_UNAVAILABLE     : "SERVICE_UNAVAILABLE", //503

        // Other
        UNVERIFIED_USER         : "UNVERIFIED_USER"
    }
} as const;



/**
 * Build the response schema of a 4xx error, matching
 * the shape sent by the Global Error Handler.
 */
function vampifyClientErrorSchema<TCode extends number, TError extends string>(
  statusCode: TCode, error: TError, description: string)
{
  return Type.Object(
  {
    statusCode: Type.Literal(statusCode, { description: "The error code" }),
    error     : Type.Literal(error, { description: "The error title" }),
    message   : Type.String({ description: "A message explaining the error" }),
    reqId     : Type.String({ description: "The server internal request id" }),
    details   : Type.Optional(Type.Any({ description: "Validation details or custom diagnostic payload" }))
  },
  {
    description: description
  });
}


/**
 * Build the response schema of a 5xx error. Same as a 4xx error,
 * plus the stack (only populated in development/test mode).
 */
function vampifyServerErrorSchema<TCode extends number, TError extends string>(
  statusCode: TCode, error: TError, description: string)
{
  return Type.Object(
  {
    statusCode: Type.Literal(statusCode, { description: "The error code" }),
    error     : Type.Literal(error, { description: "The error title" }),
    message   : Type.String({ description: "A message describing the error" }),
    reqId     : Type.String({ description: "The server internal request id" }),
    stack     : Type.Optional(Type.Any({ description: "An object containing the stack" })),
    details   : Type.Optional(Type.Any({ description: "Validation details or custom diagnostic payload" }))
  },
  {
    description: description
  });
}



/**
 * These are the standard errors that are
 * caught by the Global Error Handler.
 * 
 * Use this object to expand the response
 * schema of your routes. Prefer picking only the
 * codes a route can return with vampifyResponseErrors().
 */
export const VampifyStandardResponseErrors =
{
  // 4xx Client Errors.
  400: vampifyClientErrorSchema(400, 'Bad Request',                     'Validation or logic error'),
  401: vampifyClientErrorSchema(401, 'Unauthorized',                    'Authentication required'),
  402: vampifyClientErrorSchema(402, 'Payment Required',                'Payment required'),
  403: vampifyClientErrorSchema(403, 'Forbidden',                       'Access denied'),
  404: vampifyClientErrorSchema(404, 'Not Found',                       'The requested resource was not found'),
  405: vampifyClientErrorSchema(405, 'Method Not Allowed',              'The HTTP method is not allowed for this resource'),
  406: vampifyClientErrorSchema(406, 'Not Acceptable',                  'No representation matches the Accept headers'),
  407: vampifyClientErrorSchema(407, 'Proxy Authentication Required',   'Proxy authentication required'),
  408: vampifyClientErrorSchema(408, 'Request Timeout',                 'The server timed out waiting for the request'),
  409: vampifyClientErrorSchema(409, 'Conflict',                        'Duplicate entry found'),
  410: vampifyClientErrorSchema(410, 'Gone',                            'The resource is permanently gone'),
  411: vampifyClientErrorSchema(411, 'Length Required',                 'Content-Length header is required'),
  412: vampifyClientErrorSchema(412, 'Precondition Failed',             'A request precondition failed'),
  413: vampifyClientErrorSchema(413, 'Payload Too Large',               'The request payload is too large'),
  414: vampifyClientErrorSchema(414, 'URI Too Long',                    'The request URI is too long'),
  415: vampifyClientErrorSchema(415, 'Unsupported Media Type',          'The request media type is not supported'),
  416: vampifyClientErrorSchema(416, 'Range Not Satisfiable',           'The requested range cannot be satisfied'),
  417: vampifyClientErrorSchema(417, 'Expectation Failed',              'The Expect header cannot be met'),
  418: vampifyClientErrorSchema(418, "I'm a Teapot",                    "I'm a teapot"),
  421: vampifyClientErrorSchema(421, 'Misdirected Request',             'The request was directed at the wrong server'),
  422: vampifyClientErrorSchema(422, 'Unprocessable Entity',            'The request is well-formed but semantically invalid'),
  423: vampifyClientErrorSchema(423, 'Locked',                          'The resource is locked'),
  424: vampifyClientErrorSchema(424, 'Failed Dependency',               'A dependent request failed'),
  425: vampifyClientErrorSchema(425, 'Too Early',                       'The request might be replayed'),
  426: vampifyClientErrorSchema(426, 'Upgrade Required',                'The client must switch protocols'),
  428: vampifyClientErrorSchema(428, 'Precondition Required',           'The request must be conditional'),
  429: vampifyClientErrorSchema(429, 'Too Many Requests',               'Too many requests'),
  431: vampifyClientErrorSchema(431, 'Request Header Fields Too Large', 'The request headers are too large'),
  451: vampifyClientErrorSchema(451, 'Unavailable For Legal Reasons',   'Unavailable for legal reasons'),

  // 5xx Server Errors.
  500: vampifyServerErrorSchema(500, 'Internal Server Error',           'Unexpected server error'),
  501: vampifyServerErrorSchema(501, 'Not Implemented',                 'The functionality is not implemented'),
  502: vampifyServerErrorSchema(502, 'Bad Gateway',                     'Invalid response from an upstream server'),
  503: vampifyServerErrorSchema(503, 'Service Unavailable',             'The service is temporarily unavailable'),
  504: vampifyServerErrorSchema(504, 'Gateway Timeout',                 'An upstream server timed out'),
  505: vampifyServerErrorSchema(505, 'HTTP Version Not Supported',      'The HTTP version is not supported'),
  506: vampifyServerErrorSchema(506, 'Variant Also Negotiates',         'Server content negotiation misconfiguration'),
  507: vampifyServerErrorSchema(507, 'Insufficient Storage',            'The server has insufficient storage'),
  508: vampifyServerErrorSchema(508, 'Loop Detected',                   'An infinite loop was detected'),
  510: vampifyServerErrorSchema(510, 'Not Extended',                    'Further request extensions are required'),
  511: vampifyServerErrorSchema(511, 'Network Authentication Required', 'Network authentication required')
} as const;


/**
 * Pick only the standard error schemas a route can actually return.
 * 
 * Example usage in a route schema:
 *     response: { 200: MySchema, ...vampifyResponseErrors(400, 401, 404) }
 *
 * @param codes The HTTP error codes to include.
 * @returns A subset of VampifyStandardResponseErrors.
 */
export function vampifyResponseErrors<K extends keyof typeof VampifyStandardResponseErrors>(...codes: K[]):
  Pick<typeof VampifyStandardResponseErrors, K>
{
  const picked = {} as Pick<typeof VampifyStandardResponseErrors, K>;

  for (const code of codes) picked[code] = VampifyStandardResponseErrors[code];

  return picked;
}
