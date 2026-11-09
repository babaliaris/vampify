#!/usr/bin/env node
import dotenv from 'dotenv';
import path from "node:path";
import readline from 'readline';

/**
 * Log Shipper - Standard Pipe Script
 * Usage: node app.js | node log_shipper.js
 */


/**
  * Load required environment variables.
  */
console.log(`[log_shipper.ts] Loading environment variables (${process.env.NODE_ENV})...`);
dotenv.config(
{
  path  : path.join(process.cwd(), `.env.${process.env.NODE_ENV}`),
  debug : false
});
const SERVICE_API_KEY = process.env.LOG_SHIPPER_KEY || 'WRONG_KEY';


// Define the interface for the log schema structure we are sending to the DB
interface MappedLog
{
  ip        : string;
  level     : string;
  message   : string;
  timestamp : string;
  req_id    : string | null;
  user_id   : number | null;
  url       : string | null;
  method    : string | null;
  status    : number | null;
  data      : any;
}

const TARGET_API_URL    = process.env.LOG_SHIPPER_POST_URL;
const BATCH_SIZE        = 10;   // Flush every 10 log rows
const FLUSH_INTERVAL_MS = 5000; // Force flush every 5 seconds if batch size isn't met

// Max lengths of FastifyLogPostSchema (and the t_vampify_logs columns).
// Longer values are cut, otherwise the API rejects the whole row with a 400.
const MAX_LENGTH = { message: 500, ip: 45, req_id: 50, method: 10 };


if (!TARGET_API_URL)
{
  throw new Error(`[log_shipper.ts] TARGET_API_URL was NOT provided. Check your env variables.`);
}


let buffer: MappedLog[] = [];
let flushTimeout: NodeJS.Timeout | null = null;


// Read line-by-line from process.stdin
const rl = readline.createInterface(
{
  input   : process.stdin,
  terminal: false
});


// Register to the on 'line' callback.
rl.on('line', (line: string) =>
{
  // DO NOT PROPAGATE THE LINE TO THE CONSOLE.


  // Try to parse the line as a JSON object.
  try
  {
    // Parse the Pino JSON row
    const log = JSON.parse(line);

    // Skip standard Fastify request/response logs for the ingestion endpoint
    if (log.req?.url === '/api/vampify-logs' || log.req?.url === '/vampify-logs')
    {
      return; // Ignore and do not ship
    }

    // Skip any log messages originating from our endpoint itself
    if (log.url === '/api/vampify-logs' || log.url === '/vampify-logs')
    {
      return; // Ignore and do not ship
    }

    // Map the fields dynamically from your standard Pino bindings
    const mappedLog: MappedLog =
    {
      ip        : truncate(log.req?.ip || log.payload?.ip || log.ip || "NULL", MAX_LENGTH.ip),
      level     : mapLogLevel(log.level),
      message   : truncate(log.msg || 'No message provided', MAX_LENGTH.message),
      timestamp : new Date(log.time || Date.now()).toISOString(),
      req_id    : truncateNullable(log.reqId || log.req_id || null, MAX_LENGTH.req_id),
      user_id   : toUserId(log.vampify_user_id), // Bound by vampifyAuthenticate() after a successful login check.
      url       : log.req?.url || null,
      method    : truncateNullable(log.req?.method || null, MAX_LENGTH.method),
      status    : log.res?.statusCode || null,
      data      : log.err || log.payload || log // Fallback to raw log object if no explicit error/payload
    };

    buffer.push(mappedLog);

    // Batch Check
    if (buffer.length >= BATCH_SIZE)
    {
      flushLogs();

    }

    else
    {
      resetFlushTimer();
    }
  }

  // If it fails, that is fine. It means that the console line was
  // something else.
  catch (err)
  {
    // If the line isn't valid JSON (e.g. standard startup text), ignore sending to DB
  }
});


// On read line stream closure
// check if the buffer is not empty
// and send one final log to the sever.
rl.on('close', () =>
{
  // App closed, execute final cleanup flush
  if (buffer.length > 0)
  {
    flushLogs();
  }
});



/**
 * Maps Pino's numeric levels (30, 40, etc.) to database level strings
 */
function mapLogLevel(level: string | number | undefined): string
{
  if (typeof level === 'string') return level.toLowerCase();

  switch (level)
  {
    case 10: return 'trace';
    case 20: return 'debug';
    case 30: return 'info';
    case 40: return 'warn';
    case 50: return 'error';
    case 60: return 'fatal';
    default: return 'info';
  }
}


/**
 * Cuts a value to max characters, ending with "..." when it was cut.
 * The full log line is still kept in data when the log has no err/payload.
 */
function truncate(value: unknown, max: number): string
{
  const text = String(value);
  return text.length > max ? text.slice(0, max - 3) + '...' : text;
}

function truncateNullable(value: unknown, max: number): string | null
{
  return value === null ? null : truncate(value, max);
}


/**
 * Converts the vampify_user_id log binding to a numeric user id.
 * Missing (guest/unauthenticated) or non-numeric ids become null.
 */
function toUserId(value: unknown): number | null
{
  if (value === undefined || value === null || value === '') return null;

  const id = Number(value);
  return Number.isNaN(id) ? null : id;
}


// Reset Flush Timer.
function resetFlushTimer(): void
{
  if (flushTimeout) clearTimeout(flushTimeout);

  flushTimeout = setTimeout(flushLogs, FLUSH_INTERVAL_MS);
}


/**
  * This function sends logs to the server endpoint.
  * Is is called at intervals so we don't DDOS the server.
  */
async function flushLogs(): Promise<void>
{
  if (flushTimeout)         clearTimeout(flushTimeout);
  if (buffer.length === 0)  return;

  const payload = [...buffer];
  buffer        = []; // Instantly clear to avoid duplicate sends

  // This is checked in the top of the file.
  const target_url = TARGET_API_URL || "";

  try
  {
    // Loop and POST payload records to your new Fastify DB route.
    // fetch() only rejects on network errors, so HTTP errors (401, 404, 500...)
    // are returned as rejected responses and reported below.
    const rejected = await Promise.all(
      payload.map((logRecord) =>
        fetch(target_url,
        {
          method: 'POST',
          headers:
          {
            'Content-Type'      : 'application/json',
            'x-service-api-key' : SERVICE_API_KEY
          },
          body: JSON.stringify(logRecord)
        }).then(async (res) =>
        {
          const body = await res.text(); // Always consume the body to free the connection.
          return res.ok ? null : { status: res.status, body };
        }).catch((err: Error) =>
        {
          console.error('[Shipper Error] Failed to POST log row:', err.message);
          return null;
        })
      )
    );

    // Report rejected rows once per batch, so a bad key or URL doesn't flood the console.
    const failures = rejected.filter((r) => r !== null);
    if (failures.length > 0)
    {
      const first = failures[0];
      console.error(
        `[Shipper Error] ${failures.length}/${payload.length} log rows rejected by ${target_url}. ` +
        `First: HTTP ${first.status} ${first.body.slice(0, 200)}`
      );
    }
  }

  catch (error)
  {
    console.error('[Shipper System Error] Failure executing flush:', error);
  }
}
