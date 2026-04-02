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
    X_NATIVE_DEVICE_ID  : "x-vampify-device-id"
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
 * These are the standard errors that are
 * caught by the Global Error Handler.
 * 
 * Use this object to expand the response
 * schema of your routes.
 */
export const VampifyStandardResponseErrors =
{
  400: Type.Object(
  {
    statusCode: Type.Literal(400,{description: "The error code"}),
    error     : Type.Literal('Bad Request',{description: "The error title"}),
    message   : Type.String({description: "A message explaining the error"}),
    reqId     : Type.Optional(Type.Number({description: "The request id"})),
    details   : Type.Optional(Type.Union(
    [
      Type.Array(Type.Any()),
      Type.String()
    ],
    {
      description: "Validation array or database error message" 
    }))
    
  },
  {
    description: 'Validation or logic error'
  }),


  401: Type.Object(
  {
    statusCode: Type.Literal(401),
    error     : Type.Literal('Unauthorized'),
    message   : Type.String({ description: "A msg explaining the error" }),
    reqId     : Type.String({description: "The server internal request id"}),
    details   : Type.Optional(Type.Any({description: "Details about this error."}))
  },
  
  {
    description: 'Authentication required'
  }),


  403: Type.Object(
  {
    statusCode: Type.Literal(403),
    error     : Type.Literal('Forbidden'),
    message   : Type.String({ description: "A msg explaining the error" }),
    reqId     : Type.Optional(Type.Number({description: "The request id"})),
    details   : Type.Optional(Type.Any({description: "Details about this error."}))
  },
  {
    description: 'Access denied'
  }),


  404: Type.Object(
  {
    statusCode: Type.Literal(404),
    error     : Type.Literal('Not Found'),
    message   : Type.String({ description: "A msg explaining the error" }),
    reqId     : Type.Optional(Type.Number({description: "The request id"})),
    details   : Type.Optional(Type.Any({description: "Details about this error."}))
  },
  {
    description: 'The requested resource was not found'
  }),


  409: Type.Object(
  {
    statusCode: Type.Literal(409,{description: "The error code"}),
    error     : Type.Literal('Conflict',{description: "The error title"}),
    message   : Type.String({description: "A message explaining the error"}),
    reqId     : Type.Optional(Type.Number({description: "The request id"})),
    details   : Type.Optional(Type.String({description: "A detailed description"})),
  },
  {
    description: 'Duplicate entry found'
  }),


  500: Type.Object(
  {
    statusCode: Type.Literal(500,{description: "The error code"}),
    error     : Type.Literal('Internal Server Error',{description: "The error title"}),
    message   : Type.String({description: "A message describing the error"}),
    reqId     : Type.Optional(Type.Number({description: "The request id"})),
    stack     : Type.Optional(Type.Any({description: "An object containing the stack"}))
  },
  {
    description: 'Unexpected server error'
  })
} as const;
