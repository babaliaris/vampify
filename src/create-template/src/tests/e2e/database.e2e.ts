import { test, describe} from 'node:test';
import assert from 'node:assert';
import { FastifyInstance } from 'fastify';
import { vampifySetupE2E } from "@vampify/test";
import {vampifyApp} from "../../app.js";
import { eq } from 'drizzle-orm';
import {usersTable} from "../../db/schema.js";

describe('Transaction Tests (DB)', () =>
{
  const e2e_setup = vampifySetupE2E(vampifyApp);

  test('Test Transaction Insert', async () =>
  {
    await e2e_setup.runInTransaction(async (fastify: FastifyInstance)=>
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
    await e2e_setup.runInTransaction(async (fastify: FastifyInstance)=>
    {
      // Previous 'Test Transaction' should have rolled back, so the entry should no exist.
      let select_result = await fastify.db.select().from(usersTable).where(eq(usersTable.name, "Nick"));
      assert(select_result.length === 0);
    });
  });
});