import { int, mysqlTable, bigint, varchar,  } from 'drizzle-orm/mysql-core';

export const usersTable = mysqlTable('t_users',
{
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  name: varchar({ length: 255 }).notNull(),
  age: int().notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
});