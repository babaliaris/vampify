import { test, describe } from 'node:test';
import assert from 'node:assert';
import { vampifySetupE2E } from "@vampify/test";
import { vampifyApp } from "../../app.js";
import { ROUTE_ENDPOINTS } from '../../literals.js';
import { VAMPIFY_DEBUG_MSG } from '@/core/vampify-literals.js';

describe('Utilities Tests', () => 
{
    const e2e_suite = vampifySetupE2E(vampifyApp);

    test(`Dynamic Abortion Test - ${ROUTE_ENDPOINTS.UTILITIES.ABORT_ENDPOINT}`, async () =>
    {
        // A list with all the available status (@see @/core/vampify-literals.js VAMPIFY_DEBUG_MSG object').
        const statusToTest = [400, 401, 403, 404, 409, 413, 422, 429, 500, 503];

        // For each status code.
        for (const status of statusToTest)
        {
            // Create a debug message.
            const debug_msg = `Testing failure for status ${status}`;
            
            // Execute the request.
            const response = await e2e_suite.fastify.inject(
            {
                method  : 'POST',
                url     : ROUTE_ENDPOINTS.UTILITIES.ABORT_ENDPOINT,
                payload :
                {
                    status      : status,
                    debug_msg   : debug_msg,
                    payload     : { test: "data" }
                }
            });

            // Get the response object and check the call.
            assert.strictEqual(response.statusCode, status);
            const body = JSON.parse(response.body);

            // Get the response status message.
            const expectedMsg = e2e_suite.fastify.vampifyIsProdMode()
                ? (VAMPIFY_DEBUG_MSG.REASON as any)[response.statusMessage.replace(/ /g, '_').toUpperCase()] || body.message
                : debug_msg;

            // Check if the response message is what we send.
            assert.strictEqual(body.message, expectedMsg);
        }
    });
});