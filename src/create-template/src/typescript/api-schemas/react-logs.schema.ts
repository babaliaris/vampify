import { Type, Static } from "@sinclair/typebox";
import { stdPaginationReplySchema, StdPaginationQuerySchema } from "./pagination.schema.js";


const id = Type.Number(
{
  description: "The unique id of this log"
});

const user_id = Type.Number(
{
  description: "The user id or NULL in case of a guest"
});

const ip = Type.String(
{
  description: "The IP address of the user"
});

const level = Type.String(
{
  description : "The level of the log (for example: info, error, etc)",
  maxLength   : 10
});

const message = Type.String(
{
  description : "The message of the log",
  maxLength   : 500
});

const data = Type.Optional(Type.Any(
{
  description: "The payload data that comes with the log"
}));

const url = Type.String(
{
  description: "The URL (path) that this log occured"
});

const user_agent = Type.String(
{
  description: "The user agent"
});

const browser = Type.String(
{
  description : "The browser name",
  maxLength   : 50
});

const os = Type.String(
{
  description : "The os name",
  maxLength   : 50
});

const timestamp = Type.String(
{
  description : "The teimestamp of the creation of this log",
  format      : "date-time"
});

const created_at = Type.String(
{
  description : "The creation time of the row inside the database",
  format      : "date-time"
});


/**
  * The POST data.
  */
export const ReactLogPostSchema = Type.Object(
{
  level     : level,
  message   : message,
  data      : data,
  timestamp : timestamp,
  url       : url,
  user_agent: user_agent
});

/**
  * The response data.
  */
export const ReactLogDataSchema = Type.Object(
{
  id        : id,
  user_id   : user_id,
  ip        : ip,
  level     : level,
  message   : message,
  data      : Type.Union([data, Type.Null()]),
  url       : Type.Union([url, Type.Null()]),
  user_agent: Type.Union([user_agent, Type.Null()]),
  browser   : Type.Union([browser, Type.Null()]),
  os        : Type.Union([os, Type.Null()]),
  timestamp : timestamp,
  created_at: created_at
});


export const ReactLogDeleteRepSchema = Type.Object(
{
  m_message: Type.String(
  {
    description: "A message describing the deletion process"
  }),

  m_rows_deleted: Type.Number(
  {
    description: "The amount of rows that where deleted"
  }),

  m_current_date: Type.String(
  {
    description : "The date these logs where deleted",
    format      : "date-time"
  }),

  m_target_date: Type.String(
  {
    description : "The past target date. All logs before that date where deleted.",
    format      : "date-time"
  })
});


export const ReactLogPaginateQuerySchema = Type.Intersect(
[
  StdPaginationQuerySchema,
  Type.Object(
  {
    m_level: Type.Optional(Type.String(
    {
      description: "Filter by exact log level"
    })),

    m_start_date: Type.Optional(Type.String(
    {
      format: "date-time", description: "Filter logs starting from this timestamp"
    })),

    m_end_date: Type.Optional(Type.String(
    {
      format: "date-time", description: "Filter logs up to this timestamp"
    })),

    m_user_id: Type.Optional(Type.Number(
    {
      description: "Filter logs by a specific user"
    }))
  })
]);


export type ReactLogPaginateQueryType  = Static<typeof ReactLogPaginateQuerySchema>;
export type ReactLogPaginateGetType    = Static<ReturnType<typeof stdPaginationReplySchema<typeof ReactLogDataSchema>>>;
