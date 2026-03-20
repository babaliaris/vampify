import { test, describe} from 'node:test';
import assert from 'node:assert';
import { vampifySetupE2E } from "@vampify/test";
import {vampifyApp} from "../../app.js";
import { Table} from 'drizzle-orm';
import * as schema from "../../db/schema.js";

describe('Database Tests', () =>
{
  const e2e_setup = vampifySetupE2E(vampifyApp);


  test('table should exist', async () =>
  {
    await e2e_setup.runInTransaction(async (fastify)=>
    {
      const tables = Object.values(schema).filter((entry) => entry instanceof Table);

      for (let table of tables)
      {
        const select_result = await fastify.db.select().from(table).limit(1);
        assert(select_result.length === 0);
      }
    });
  });

});