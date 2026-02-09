import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import path from 'node:path';
import fs from 'node:fs';
import mysql from "mysql2/promise";
import dotenv from 'dotenv';

const ROOT_DIR = process.cwd();
const ENV_PATH = path.join(ROOT_DIR, `.env.${process.env.NODE_ENV}`);
const MIGRATIONS_DIR = path.join(ROOT_DIR, "drizzle");

// Load ENV variables.
dotenv.config({path: ENV_PATH, debug: true});

//Migration Process.
async function runMigration()
{
  //Check if the migration folder exists.
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    throw new Error(`Migrations folder not found at: ${MIGRATIONS_DIR}`);
  }

  //Some info.
  console.info(`Starting Migration...`);
  console.info(`Folder: ${MIGRATIONS_DIR}`);
  console.info(`Target: ${process.env.DB_NAME || 'URL connection'}`);

  // Use createConnection (Single Client).
  const connection  = await mysql.createConnection(process.env.DB_URL!);
  const db          = drizzle(connection);

  // Try to execute the migration.
  try
  {
    await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
    console.info("Migrations completed successfully!");
  }
  
  catch (err)
  {
    console.error("Migration failed during execution");
    throw err;
  }
  
  finally
  {
    await connection.end();
  }
}

runMigration().catch((err) =>
{
  console.error("Critical Migration Error", err);
  process.exit(1);
});
