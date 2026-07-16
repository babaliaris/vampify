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
  url       : string | null;
  method    : string | null;
  status    : number | null;
  data      : any;
}

const TARGET_API_URL    = process.env.LOG_SHIPPER_POST_URL;
const BATCH_SIZE        = 10;   // Flush every 10 log rows
const FLUSH_INTERVAL_MS = 5000; // Force flush every 5 seconds if batch size isn't met


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
    if (log.req?.url === '/vampify-logs')
    {
      return; // Ignore and do not ship
    }

    // Skip any log messages originating from our endpoint itself
    if (log.url === '/vampify-logs')
    {
      return; // Ignore and do not ship
    }

    // Map the fields dynamically from your standard Pino bindings
    const mappedLog: MappedLog =
    {
      ip        : log.req?.ip || log.payload?.ip || log.ip || "NULL",
      level     : mapLogLevel(log.level),
      message   : log.msg || 'No message provided',
      timestamp : new Date(log.time || Date.now()).toISOString(),
      req_id    : log.reqId || log.req_id || null,
      url       : log.req?.url || null,
      method    : log.req?.method || null,
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
    // Loop and POST payload records to your new Fastify DB route
    await Promise.all(
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
        }).catch((err: Error) =>
        {
          console.error('[Shipper Error] Failed to POST log row:', err.message);
        })
      )
    );
  }

  catch (error)
  {
    console.error('[Shipper System Error] Failure executing flush:', error);
  }
}
