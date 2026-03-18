import {
  FastifyInstance,
  FastifyBaseLogger, 
  RawReplyDefaultExpression, 
  RawRequestDefaultExpression, 
  RawServerDefault  } from 'fastify';

import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';

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
