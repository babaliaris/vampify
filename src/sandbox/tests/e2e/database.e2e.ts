import { test, describe} from 'node:test';
import assert from 'node:assert';
import { VampifyInstance } from "@/core/vampify-literals.js";
import { vampifySetupE2E } from "@vampify/test";
import {vampifyApp} from "@/sandbox/app.js";

import { eq, Table} from 'drizzle-orm';
import * as schema from "../../db/schema.js";
import {usersTable} from "../../db/schema.js";

describe('Database Tests', () =>
{
  const e2e_suite = vampifySetupE2E(vampifyApp);

  test('table should exist', async () =>
  {
    await e2e_suite.runInTransaction(async (fastify)=>
    {
      const tables = Object.values(schema).filter((entry) => entry instanceof Table);

      for (let table of tables)
      {
        const select_result = await fastify.db.select().from(table).limit(1);
        assert(select_result.length === 0);
      }
    });
  });



  test('Test Transaction Insert', async () =>
  {
    await e2e_suite.runInTransaction(async (fastify: VampifyInstance)=>
    {
      // Insert a user and check for success.
      const insert_result = await fastify.db.insert(usersTable).values({name: "Nick", age: 30, email: "something@gmail.com"});
      assert(insert_result[0].insertId > 0);

      // Do a select test.
      let select_result = await fastify.db.select().from(usersTable).where(eq(usersTable.name, "Nick"));
      assert(select_result.length === 1);
      assert(select_result[0].name === "Nick");
    });
  });

  test('Test Transaction Cleared', async () =>
  {
    await e2e_suite.runInTransaction(async (fastify: VampifyInstance)=>
    {
      // Previous 'Test Transaction' should have rolled back, so the entry should no exist.
      let select_result = await fastify.db.select().from(usersTable).where(eq(usersTable.name, "Nick"));
      assert(select_result.length === 0);
    });
  });
});