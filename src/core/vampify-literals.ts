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
};

export type VampifyInstance = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  FastifyBaseLogger,
  TypeBoxTypeProvider
>;



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
    stack     : Type.Optional(Type.Any({description: "An object containing the stack"}))
  },
  {
    description: 'Unexpected server error'
  })
};
