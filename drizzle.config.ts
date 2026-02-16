import dotenv from 'dotenv';
import { defineConfig } from 'drizzle-kit';

dotenv.config(
{
    path: `.env.${process.env.NODE_ENV}`,
    debug: true
});

export default defineConfig({
  out: './drizzle',
  schema: './src/sandbox/db/schema.ts',
  dialect: 'mysql',
  dbCredentials: {
    url: process.env.DB_URL!,
  },
});
