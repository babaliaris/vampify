import { sql } from "drizzle-orm";
import {
  int, mysqlTable, bigint, varchar, json, text, datetime,
  mysqlEnum, boolean
} from 'drizzle-orm/mysql-core';

export const usersTable = mysqlTable('t_users',
{
  id                : bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  email             : varchar("m_email", { length: 255 }).notNull().unique(),
  password          : varchar("m_password", { length: 255 }).notNull(),
  role              : varchar("m_role", {length: 255}).notNull().default("GUEST"),
  verification_hash : varchar("m_verification_hash", { length: 255 }).notNull(),
  is_verified       : boolean("m_is_verified").notNull()
});

export const ReactLogsTable = mysqlTable('t_react_logs',
{
  id        : bigint("m_id", { mode: 'number' }).primaryKey().autoincrement(),
  user_id   : bigint("m_user_id", { mode: 'number' }).notNull(),
  ip        : varchar("m_ip", { length: 45 }).notNull(),
  level     : varchar("m_level", { length: 10 }).notNull(),
  message   : varchar("m_message", { length: 500 }).notNull(),
  data      : json("m_payload"),
  url       : text("m_url"),
  user_agent: text("m_user_agent"),
  browser   : varchar("m_browser", { length: 50 }),
  os        : varchar("m_os", { length: 50 }),
  timestamp : datetime("m_timestamp", { mode: 'date', fsp: 3}).notNull(),
  created_at: datetime("m_created_at", { mode: 'date', fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`)
});


export const VampifyLogsTable = mysqlTable('t_vampify_logs', {
  id: bigint("m_id", { mode: 'number' }).primaryKey().autoincrement(),
  req_id  : varchar("m_req_id", { length: 50 }),
  user_id : bigint("m_user_id", { mode: 'number' }),
  ip      : varchar("m_ip", { length: 45 }).notNull(),
  level   : mysqlEnum("m_level", ['trace', 'debug', 'warn', 'error', 'fatal', 'info']).notNull(),
  message : varchar("m_message", { length: 500 }).notNull(),
  data    : json("m_payload"),
  url     : text("m_url"),
  method  : varchar("m_method", { length: 10 }),
  status  : int("m_status"),
  timestamp : datetime("m_timestamp", { mode: 'date', fsp: 3 }).notNull(),
  created_at: datetime("m_created_at", { mode: 'date', fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`)
});
