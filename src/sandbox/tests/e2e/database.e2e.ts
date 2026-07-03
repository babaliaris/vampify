import { test, describe} from 'node:test';
import assert from 'node:assert';
import { VampifyInstance } from "@/core/vampify-literals.js";
import { vampifySetupE2E } from "@vampify/test";
import {vampifyApp} from "@/sandbox/app.js";
import { FastifyPluginAsync } from 'fastify';

import { eq, Table} from 'drizzle-orm';
import * as schema from "../../db/schema.js";
import {usersTable} from "../../db/schema.js";

const mock_routes: FastifyPluginAsync = async (fastify)=>
{
  fastify.post('/test-transaction-retry', async (req, rep) =>
  {
    const result = await req.runInTransactionRetry(async (tx) =>
    {
      const insertResult = await tx.insert(usersTable).values(
      {
        name: "Test Retry User",
        age: 25,
        email: "retry@vampify.io"
      });

      // Fetch back the newly inserted row inside the transaction block
      const row = await tx
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, insertResult[0].insertId));

      return row[0];
    });

    return rep.status(201).send(result);
  });
};


describe('Database Tests', () =>
{
  const e2e_suite = vampifySetupE2E(vampifyApp, mock_routes);

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


  test('Should execute runInTransactionRetry successfully via request payload', async () =>
  {
    await e2e_suite.runInTransaction(async (fastify: VampifyInstance)=>
    {
      const response = await fastify.inject(
      {
        method: 'POST',
        url   : '/test-transaction-retry'
      });

      assert.strictEqual(response.statusCode, 201);

      const body = JSON.parse(response.payload);
      assert.strictEqual(body.name, "Test Retry User");
      assert.strictEqual(body.age, 25);
      assert.strictEqual(body.email, "retry@vampify.io");
    });
  });

});
