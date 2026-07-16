import { Type, Static } from "@sinclair/typebox";
import { stdPaginationReplySchema, StdPaginationQuerySchema } from "./pagination.schema.js";

const id = Type.Number(
{
  description: "The unique ID of this server log"
});

const req_id = Type.Union(
[
  Type.String(
  {
    description : "Fastify unique request correlation ID",
    maxLength   : 50
  }),
  Type.Null()
]);

const user_id = Type.Union(
[
  Type.Number(
  {
    description: "The user id or NULL for guests"
  }),
  Type.Null()
]);

const ip = Type.String(
{
  description : "The IP address that triggered the event",
  maxLength   : 45
});

const level = Type.Union(
[
  Type.Literal('trace'),
  Type.Literal('debug'),
  Type.Literal('warn'),
  Type.Literal('error'),
  Type.Literal('fatal'),
  Type.Literal('info')
]);

const message = Type.String(
{
  description : "The message of the server log",
  maxLength   : 500
});

const data = Type.Optional(Type.Any(
{
  description: "The contextual payload data or error details"
}));

const url = Type.Union(
[
  Type.String(
  {
    description: "The endpoint URL hit on the server"
  }),
  Type.Null()
]);

const method = Type.Union(
[
  Type.String(
  {
    description : "HTTP Method utilized",
    maxLength   : 10
  }),
  Type.Null()
]);

const status = Type.Union(
[
  Type.Number(
  {
    description: "HTTP response status code returned"
  }),
  Type.Null()
]);

const timestamp = Type.String(
{
  description : "The exact moment the log event was generated",
  format      : "date-time"
});

const created_at = Type.String(
{
  description : "Row creation timestamp in the database",
  format      : "date-time"
});

/**
 * The POST schema (in case backend microservices or background workers want to push log events)
 */
export const FastifyLogPostSchema = Type.Object(
{
  ip        : ip,
  level     : level,
  message   : message,
  data      : data,
  timestamp : timestamp,
  req_id    : Type.Optional(Type.String()),
  url       : Type.Optional(Type.String()),
  method    : Type.Optional(Type.String()),
  status    : Type.Optional(Type.Number())
});

/**
 * Single Log Record Representation
 */
export const FastifyLogDataSchema = Type.Object(
{
  id        : id,
  req_id    : req_id,
  user_id   : user_id,
  ip        : ip,
  level     : level,
  message   : message,
  data      : Type.Union([data, Type.Null()]),
  url       : url,
  method    : method,
  status    : status,
  timestamp : timestamp,
  created_at: created_at
});

/**
 * Response when deleting logs
 */
export const FastifyLogDeleteRepSchema = Type.Object(
{
  message: Type.String(
  {
    description: "A description of the cleanup results"
  }),

  rows_deleted: Type.Number(
  {
    description: "Number of outdated logs purged"
  }),

  current_date: Type.String(
  {
    format: "date-time"
  }),

  target_date: Type.String(
  {
    description : "Deletion threshold date",
    format      : "date-time"
  })
});

/**
 * Paginated Query filtering options
 */
export const FastifyLogPaginateQuerySchema = Type.Intersect(
[
  StdPaginationQuerySchema,
  Type.Object(
  {
    m_level: Type.Optional(level),

    m_status: Type.Optional(Type.Number(
    {
      description: "Filter by precise HTTP status code"
    })),

    m_start_date: Type.Optional(Type.String(
    {
      format      : "date-time",
      description : "Return records newer than this timestamp"
    })),

    m_end_date: Type.Optional(Type.String(
    {
      format      : "date-time",
      description : "Return records older than this timestamp"
    })),

    m_user_id: Type.Optional(Type.Number(
    {
      description: "Filter by the execution user"
    }))
  })
]);

export type FastifyLogPaginateQueryType = Static<typeof FastifyLogPaginateQuerySchema>;
export type FastifyLogPaginateGetType   = Static<ReturnType<typeof stdPaginationReplySchema<typeof FastifyLogDataSchema>>>;
