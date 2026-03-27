import { test, describe} from 'node:test';
import assert from 'node:assert';
import { vampifySetupE2E } from "@vampify/test";
import {vampifyApp} from "../../app.js";
import { ROUTE_ENDPOINTS } from '../../literals.js';
import { VAMPIFY_LITERALS } from '@vampify/literals';

describe('Vampify Framework Tests', () => 
{
    const e2e_suite = vampifySetupE2E(vampifyApp);


    test('Should perform full Cookie + Footprint flow', async () =>
    {
        // Login to get the cookie
        const loginRes = await e2e_suite.fastify.inject(
        {
        method: 'GET',
        url   : ROUTE_ENDPOINTS.CREDENTIALS.ROOT
        });

        assert.strictEqual(loginRes.statusCode, 200);

        // Get the cookie from headers
        // The header looks like: vampify_token=abc...; HttpOnly; Path=/
        const cookieHeader = loginRes.headers['set-cookie'];
        assert.ok(cookieHeader, 'Login should return a set-cookie header');

        // Use the cookie to access the protected route
        const checkRes = await e2e_suite.fastify.inject({
        method  : 'GET',
        url     : ROUTE_ENDPOINTS.CREDENTIALS.CHECK_PAYLOAD,
        headers :
        {
            // We pass the cookie string back exactly as received
            cookie: Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader
        }
        });

        assert.strictEqual(checkRes.statusCode, 200);
        assert.strictEqual(checkRes.payload, "Payload checked successfully!");
    });



    test('Should fail if the Digital Footprint is compromised', async () =>
    {
        // 1. Login to get a valid cookie
        const loginRes = await e2e_suite.fastify.inject(
        {
        method  : 'GET',
        url     : ROUTE_ENDPOINTS.CREDENTIALS.ROOT,
        headers : { 'user-agent': 'VampireBrowser/1.0' }
        });

        const cookie = loginRes.headers['set-cookie'];

        // 2. Attempt to use that cookie from a DIFFERENT User-Agent
        const maliciousRes = await e2e_suite.fastify.inject({
        method  : 'GET',
        url     : ROUTE_ENDPOINTS.CREDENTIALS.CHECK_PAYLOAD,
        headers :
        {
            cookie: Array.isArray(cookie) ? cookie[0] : cookie,
            'user-agent': 'HackerBrowser/2.0' // Footprint mismatch!
        }
        });

        assert.strictEqual(maliciousRes.statusCode, 401);
    });


    test('should hash and compare password correctly', async()=>
    {
        const password = "this-is-a-password";
    
        const hash = await e2e_suite.fastify.vampifyHashCreate(password);

        const success = await e2e_suite.fastify.vampifyHashCompare(password, hash);

        assert.strictEqual(success, true);
    });




    test('Should perform full Native (Smartphone) Header + DeviceID flow', async () =>
    {
        const mockDeviceId  = 'iphone-15-pro-uuid-123';

        // Login with a Device ID to get the Token in the JSON body
        const loginRes = await e2e_suite.fastify.inject(
        {
        method  : 'GET',
        url     : ROUTE_ENDPOINTS.CREDENTIALS.ROOT,
        headers :
        {
            [VAMPIFY_LITERALS.X_NATIVE_DEVICE_ID]: mockDeviceId
        }
        });
        assert.strictEqual(loginRes.statusCode, 200);
        
        // Check the body.
        const body = JSON.parse(loginRes.payload);
        assert.ok(body.token, 'Response body should contain a JWT token');
        
        // Ensure no cookie was set.
        assert.strictEqual(loginRes.headers['set-cookie'], undefined);

        // Access protected route using Authorization Header + Device ID Header
        const checkRes = await e2e_suite.fastify.inject(
        {
        method  : 'GET',
        url     : ROUTE_ENDPOINTS.CREDENTIALS.CHECK_PAYLOAD,
        headers :
        {
            'authorization': `Bearer ${body.token}`,
            [VAMPIFY_LITERALS.X_NATIVE_DEVICE_ID]: mockDeviceId
        }
        });

        assert.strictEqual(checkRes.statusCode, 200);
        assert.strictEqual(checkRes.payload, "Payload checked successfully!");

        // Fail if the Device ID is missing (Footprint mismatch)
        const failRes = await e2e_suite.fastify.inject({
        method: 'GET',
        url: ROUTE_ENDPOINTS.CREDENTIALS.CHECK_PAYLOAD,
        headers:
        {
            'authorization': `Bearer ${body.token}`,
            // Missing X_NATIVE_DEVICE_ID!
        }
        });

        assert.strictEqual(failRes.statusCode, 401);
    });



    test('Should perform full Native auth WITH full signPayload options', async () =>
    {
        const mockDeviceId  = 'iphone-15-pro-uuid-123';

        // Payload request with all the sign payload options.
        const request_payload =
        {
            body    :
            {
                data: 0
            },
            options:
            {
                device_id: 'iphone-15-pro-uuid-123',
                expires  : 60, // 60 seconds
                jwt_data :
                {
                    role: 'hero'
                }
            }
        }

        // Login with a Device ID to get the Token in the JSON body
        const loginRes = await e2e_suite.fastify.inject(
        {
            method  : 'POST',
            url     : ROUTE_ENDPOINTS.CREDENTIALS.FULL_PAYLOAD_OPTIONS,
            payload : request_payload
        });
        assert.strictEqual(loginRes.statusCode, 200);
        const response_body = JSON.parse(loginRes.payload);

        // Check the response data.
        assert.ok(response_body.token, 'Response body should contain a JWT token');
        assert.ok(response_body.body && response_body.body !== null, "The body property should be defined");
        assert.strictEqual(response_body.body.device_id, request_payload.options.device_id);
        assert.strictEqual(response_body.body.expires, request_payload.options.expires);
        assert.strictEqual(response_body.body.jwt_data.role, request_payload.options.jwt_data.role);
        
        // Ensure no cookie was set.
        assert.strictEqual(loginRes.headers['set-cookie'], undefined);

        // Access protected route using Authorization Header + Device ID Header
        const checkRes = await e2e_suite.fastify.inject(
        {
            method  : 'GET',
            url     : ROUTE_ENDPOINTS.CREDENTIALS.CHECK_PAYLOAD,
            headers :
            {
                'authorization': `Bearer ${response_body.token}`,
                [VAMPIFY_LITERALS.X_NATIVE_DEVICE_ID]: mockDeviceId
            }
        });

        assert.strictEqual(checkRes.statusCode, 200);
        assert.strictEqual(checkRes.payload, "Payload checked successfully!");
    });

});