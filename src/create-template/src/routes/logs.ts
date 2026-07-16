import { FastifyPluginAsync } from 'fastify';
import { VampifyInstance, VampifyStandardResponseErrors } from '@vampify/literals';
import { ROUTE_ENDPOINTS } from '../literals.js';
import { UAParser } from 'ua-parser-js';
import { Type } from '@sinclair/typebox';
import {
  desc, like, sql, lt, lte, or, eq, gte, and
} from 'drizzle-orm';
import { ReactLogsTable, VampifyLogsTable } from '@/db/schema.js';
import {
  ReactLogDataSchema, ReactLogDeleteRepSchema, ReactLogPostSchema,
  ReactLogPaginateQuerySchema
} from '@/typescript/api-schemas/react-logs.schema.js';
import {
  FastifyLogDataSchema,
  FastifyLogDeleteRepSchema,
  FastifyLogPostSchema,
  FastifyLogPaginateQuerySchema
} from '@/typescript/api-schemas/vampify-logs.schema.js';
import { stdPaginationReplySchema } from '@/typescript/api-schemas/pagination.schema.js';


const logs: FastifyPluginAsync = async (fastify: VampifyInstance): Promise<void>=>
{
  fastify.post(ROUTE_ENDPOINTS.REACT_LOGS.ROOT,
  {
    preHandler: fastify.vampifyAuth,
    schema:
    {
      summary : "Post react logs",
      tags    : ["Logs"],
      body    : ReactLogPostSchema,
      response:
      {
        202: Type.Null(),
        401: VampifyStandardResponseErrors[401]
      }
    }
  }, async (req, rep) => {

    // Get User ID.
    const user_id = Number(req.vampify_payload!.user_id);

    // Parse User Agent for better filtering later
    const parser  = new UAParser(req.headers['user-agent']);
    const browser = parser.getBrowser();
    const os      = parser.getOS();

    // Add the log to the table.
    await fastify.db.insert(ReactLogsTable).values(
    {
      user_id   : user_id,
      ip        : req.ip,
      level     : req.body.level,
      message   : req.body.message,
      data      : req.body.data,
      url       : req.body.url,
      user_agent: req.body.user_agent,
      browser   : `${browser.name ?? 'Unknown'} ${browser.version ?? ''}`.trim(),
      os        : `${os.name ?? 'Unknown'} ${os.version ?? ''}`.trim(),
      timestamp : new Date(req.body.timestamp)
    });

    // return 202 (Accepted)
    return rep.status(202).send(null);
  });



  /**
    * Get React Logs.
    */
  fastify.get(ROUTE_ENDPOINTS.REACT_LOGS.ROOT,
  {
    preHandler:
    [
      fastify.vampifyAuth,
      fastify.vampifyRequireRolesAuth<string>("ADMIN")
    ],
    schema:
    {
      summary     : "Get react logs with advanced filtering",
      tags        : ["Logs"],
      querystring : ReactLogPaginateQuerySchema,
      response    :
      {
        200: stdPaginationReplySchema(ReactLogDataSchema),
        400: VampifyStandardResponseErrors[400],
        401: VampifyStandardResponseErrors[401],
        403: VampifyStandardResponseErrors[403]
      },
    description: `
    ### REACT LOGS VIEWER & FILTERING ENGINE
    This endpoint retrieves client-side logs sent from the React application.
    By default, results are returned in descending chronological order (newest logs first)
    to make troubleshooting active issues easier.

    ### SEARCH & FILTER BEHAVIOR
    You can combine multiple filters together to drill down into specific events:

    • Text Search (m_search)
      Performs a partial, wildcard-wrapped match against both the "message" and "url" fields.
      Example: "checkout" matches a URL like "/checkout/success" or a message like "Failed to load checkout asset".

    • Log Level (m_level)
      Exact match on the log severity string.
      Typical values: info, warn, error, debug.

    • User Scope (m_user_id)
      Filters actions taken by a specific user. Omit or pass null if you are analyzing anonymous/guest user journeys.

    • Time Windowing (m_start_date & m_end_date)
      Filters logs based on the client's internal clock (timestamp) when the event occurred.
      Must be valid ISO 8601 Date-Time strings (e.g., 2026-07-15T12:00:00.000Z).

    ### PAGINATION (STANDARD)
    Uses the standard pagination query schema:
    • m_page: The page index (0-based).
    • m_limit: The number of items to return per page.
        `.trim(),
  }
  }, async (req, rep) =>
  {
    const table   = ReactLogsTable;
    const offset  = req.query.m_page * req.query.m_limit;

    // Build an array of dynamic SQL conditions
    const conditions = [];

    // Filter by Level (exact match is usually better than 'like' for levels)
    if (req.query.m_level)
    {
      conditions.push(eq(table.level, req.query.m_level));
    }

    // Filter by User ID
    if (req.query.m_user_id !== undefined)
    {
      conditions.push(eq(table.user_id, req.query.m_user_id));
    }

    // Filter by Date Range (using the timestamp the client sent)
    if (req.query.m_start_date)
    {
      conditions.push(gte(table.timestamp, new Date(req.query.m_start_date)));
    }

    if (req.query.m_end_date)
    {
      conditions.push(lte(table.timestamp, new Date(req.query.m_end_date)));
    }

    // Combine all conditions using 'and'
    const final_filters = conditions.length > 0 ? and(...conditions) : undefined;

    // Smart Text Search: search both 'message' OR 'url'
    if (req.query.m_search)
    {
      const searchPattern = `%${req.query.m_search}%`;
      conditions.push(
        or(
          like(table.message, searchPattern),
          like(table.url, searchPattern)
        )
      );
    }

    // Get the Data
    const data = await fastify.db
    .select()
    .from(table)
    .where(final_filters)
    .limit(req.query.m_limit)
    .offset(offset)
    .orderBy(desc(table.created_at));

    // Get Count
    const [countResult] = await fastify.db
    .select({ count: sql<number>`count(*)` })
    .from(table)
    .where(final_filters);

    // Prepare and return the response.
    const totalRows   = Number(countResult.count);
    const totalPages  = Math.ceil(totalRows / req.query.m_limit) || 1;
    return rep.status(200).send(
    {
      m_data: data.map((old_data)=>(
      {
        ...old_data,
        timestamp : old_data.timestamp.toISOString(),
        created_at: old_data.created_at.toISOString()
      })),
      m_meta:
      {
          m_total_pages : totalPages,
          m_current_page: req.query.m_page,
          m_limit       : req.query.m_limit
      }
    });
  });



  /**
    * Delete React Logs.
    */
  fastify.delete(ROUTE_ENDPOINTS.REACT_LOGS.ROOT,
  {
    preHandler:
    [
      fastify.vampifyAuth,
      fastify.vampifyRequireRolesAuth<string>("ADMIN")
    ],
    schema:
    {
      summary     : "Delete react logs",
      description : "Delete react logs that are older than a month",
      tags        : ["Logs"],
      querystring : Type.Object(
      {
        m_target_date: Type.Optional(Type.String(
        {
          description: "All logs before this date will be deleted.",
          format: "date-time"
        }))
      }),
      response:
      {
        200: ReactLogDeleteRepSchema,
        400: VampifyStandardResponseErrors[400],
        401: VampifyStandardResponseErrors[401],
        403: VampifyStandardResponseErrors[403]
      }
    }
  }, async (req, rep) =>
  {
    const now         = new Date();
    const target_date = req.query.m_target_date
        ? new Date(req.query.m_target_date)
        : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Performe the deletion.
    const del_result = await fastify.db
    .delete(ReactLogsTable)
    .where(
      lt(ReactLogsTable.created_at, target_date)
    )

    // Create a response message.
    const message = del_result[0].affectedRows > 0
    ? `Logs before ${target_date.toDateString()} were deleted successfully!`
    : `No logs where deleted`;

    return rep.status(200).send(
    {
      m_message     : message,
      m_current_date: new Date().toISOString(),
      m_target_date : target_date.toISOString(),
      m_rows_deleted: del_result[0].affectedRows
    });
  });




  /**
   * Post Server Logs (Internal or microservice submissions)
   */
  fastify.post(ROUTE_ENDPOINTS.VAMPIFY_LOGS.ROOT,
  {
    logLevel  : "silent",
    preHandler:
    [
      fastify.vampifyServiceAuth
    ],
    schema:
    {
      summary : "Post backend/system logs",
      tags    : ["Logs"],
      body    : FastifyLogPostSchema,
      response:
      {
        202: Type.Null(),
        401: VampifyStandardResponseErrors[401]
      }
    }
  }, async (req, rep) =>
  {
    const raw_id  = Number(req.vampify_payload?.user_id);
    const user_id = !Number.isNaN(raw_id) ? raw_id : null;

    await fastify.db.insert(VampifyLogsTable).values(
    {
      req_id    : req.body.req_id || req.id,
      user_id   : user_id,
      ip        : req.body.ip,
      level     : req.body.level,
      message   : req.body.message,
      data      : req.body.data,
      url       : req.body.url || null,
      method    : req.body.method || null,
      status    : req.body.status || null,
      timestamp : new Date(req.body.timestamp)
    });

    return rep.status(202).send(null);
  });


  /**
   * Get Paginated Fastify Server Logs with filters
   */
  fastify.get(ROUTE_ENDPOINTS.VAMPIFY_LOGS.ROOT,
  {
    preHandler:
    [
      fastify.vampifyAuth,
      fastify.vampifyRequireRolesAuth<string>("ADMIN")
    ],
    schema:
    {
      summary     : "Get server logs with advanced filtering",
      tags        : ["Logs"],
      querystring : FastifyLogPaginateQuerySchema,
      response    :
      {
        200: stdPaginationReplySchema(FastifyLogDataSchema),
        400: VampifyStandardResponseErrors[400],
        401: VampifyStandardResponseErrors[401],
        403: VampifyStandardResponseErrors[403]
      },
    description: `
    ### FASTIFY SERVER LOGS VIEWER (VAMPIFY)
    Allows administrators to search, filter, and trace system-wide server logs.

    ---

    #### SEARCH & TRACING
    - **\`m_search\` (Smart Search):** Performs a case-insensitive SQL \`LIKE\` wildcard search (\`%\${search}%\`) across three high-value columns simultaneously:
      - **Request Trace ID (\`m_req_id\`):** **(Most Common Use Case)** Pass a unique request ID (e.g., \`req-15\`) to isolate the exact lifecycle of a single HTTP request (correlating its "incoming request" and "request completed" log lines).
      - **Message (\`m_message\`):** Search for errors, startup announcements, or specific keywords.
      - **URL Path (\`m_url\`):** Search for specific route endpoints (e.g., \`/balance-sheet\`).

    ---

    #### DISCRETE FILTERS (Exact Matches)
    All active filters are combined using a logical **\`AND\`** block.
    - **\`m_level\`:** Filters exactly by severity log level (e.g., \`info\`, \`error\`, \`warn\`).
    - **\`m_user_id\`:** Filters logs associated with a specific user account (is \`NULL\` for guest/system activities).
    - **\`m_status\`:** Filters precisely by the returned HTTP status code integer (e.g., \`200\`, \`500\`). Note that since Fastify logs request starts and finishes separately, status codes are only populated on request *completion* logs.

    ---

    #### TIME WINDOWS
    - **\`m_start_date\` / \`m_end_date\`:** Restricts the search scope to a specific window of \`m_timestamp\` (the application-generated timestamp, ensuring accurate execution tracking). Date strings are parsed dynamically into JS Date objects before querying.

    ---

    #### PAGINATION
    Uses standard offset-based pagination.
    - **Formula:** \`Offset = m_page * m_limit\`. 
    - Logs are ordered sequentially by **\`m_created_at DESC\`** (most recent database insertions first).
    `,
  }
  }, async (req, rep) =>
  {
    const table       = VampifyLogsTable;
    const offset      = req.query.m_page * req.query.m_limit;
    const conditions  = [];

    // Filter by Level
    if (req.query.m_level)
    {
      conditions.push(eq(table.level, req.query.m_level));
    }

    // Filter by User ID
    if (req.query.m_user_id !== undefined)
    {
      conditions.push(eq(table.user_id, req.query.m_user_id));
    }

    // Filter by precise HTTP status code
    if (req.query.m_status !== undefined)
    {
      conditions.push(eq(table.status, req.query.m_status));
    }

    // Filter by Date Window
    if (req.query.m_start_date)
    {
      conditions.push(gte(table.timestamp, new Date(req.query.m_start_date)));
    }

    if (req.query.m_end_date)
    {
      conditions.push(lte(table.timestamp, new Date(req.query.m_end_date)));
    }

    // Smart Text Search (Searches error message, URL path, and request correlation ID)
    if (req.query.m_search)
    {
      const searchPattern = `%${req.query.m_search}%`;
      conditions.push(
        or(
          like(table.message, searchPattern),
          like(table.url, searchPattern),
          like(table.req_id, searchPattern)
        )
      );
    }

    const final_filters = conditions.length > 0 ? and(...conditions) : undefined;

    // Retrieve Data
    const data = await fastify.db
    .select()
    .from(table)
    .where(final_filters)
    .limit(req.query.m_limit)
    .offset(offset)
    .orderBy(desc(table.created_at));

    // Retrieve Total Row Count for Meta calculations
    const [countResult] = await fastify.db
    .select({ count: sql<number>`count(*)` })
    .from(table)
    .where(final_filters);

    const totalRows   = Number(countResult.count);
    const totalPages  = Math.ceil(totalRows / req.query.m_limit) || 1;

    return rep.status(200).send(
    {
      m_data: data.map((log) => (
      {
        ...log,
        timestamp : log.timestamp.toISOString(),
        created_at: log.created_at.toISOString()
      })),

      m_meta:
      {
        m_total_pages : totalPages,
        m_current_page: req.query.m_page,
        m_limit       : req.query.m_limit
      }
    });
  });

  /**
   * Delete Old Fastify Logs
   */
  fastify.delete(ROUTE_ENDPOINTS.VAMPIFY_LOGS.ROOT,
  {
    preHandler: [
      fastify.vampifyAuth,
      fastify.vampifyRequireRolesAuth<string>("ADMIN")
    ],
    schema:
    {
      summary     : "Purge old server logs",
      description : "Deletes Fastify server logs older than a target threshold (defaults to 30 days).",
      tags        : ["Logs"],
      querystring : Type.Object(
      {
        m_target_date: Type.Optional(Type.String(
        {
          description : "Purge boundary. Logs older than this will be deleted.",
          format      : "date-time"
        }))
      }),
      response:
      {
        200: FastifyLogDeleteRepSchema,
        400: VampifyStandardResponseErrors[400],
        401: VampifyStandardResponseErrors[401],
        403: VampifyStandardResponseErrors[403]
      }
    }
  }, async (req, rep) =>
  {
    const now = new Date();
    const target_date = req.query.m_target_date
      ? new Date(req.query.m_target_date)
      : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const del_result = await fastify.db
    .delete(VampifyLogsTable)
    .where(lt(VampifyLogsTable.created_at, target_date));

    const message = del_result[0].affectedRows > 0
      ? `Server logs older than ${target_date.toDateString()} were cleaned up successfully!`
      : `No logs met the purge conditions. Database is already clean.`;

    return rep.status(200).send({
      message     : message,
      current_date: new Date().toISOString(),
      target_date : target_date.toISOString(),
      rows_deleted: del_result[0].affectedRows
    });
  });
};

export default logs;

