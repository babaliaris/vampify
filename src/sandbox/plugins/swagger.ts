import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { VAMPIFY_LITERALS } from "@/core/vampify-literals.js";
import { ROUTE_ENDPOINTS } from "../literals.js";

const swaggerPlugin = fp(async (fastify: FastifyInstance)=>
{
    // Register Swagger.
    await fastify.register(fastifySwagger,
    {
        openapi:
        {
            info:
            {
                title       : 'Vampify API',
                description : 'The backbone of the Vampify system',
                version     : '1.0.0'
            },
            components:
            {
                securitySchemes:
                {
                    // Web Frontend (JWT in HttpOnly Cookie)
                    cookieAuth:
                    {
                        type        : 'apiKey',
                        in          : 'cookie',
                        name        : VAMPIFY_LITERALS.PAYLOAD_COOKIE_NAME,
                        description : 'JWT session stored in an HttpOnly cookie'
                    },

                    // Native Apps (Device Identification)
                    NativeDeviceID:
                    {
                        type: 'apiKey',
                        in: 'header',
                        name: VAMPIFY_LITERALS.X_NATIVE_DEVICE_ID,
                        description: 'Enter a unique Device ID to simulate a mobile request. This tells the server to return the JWT in the JSON body instead of a Cookie.'
                    },

                    // Bearer Token for subsequent authenticated requests
                    BearerAuth:
                    {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT',
                        description: "After log in, send the token in a classic Bearer header to authenticate the logged in user."
                    }
                }
            }
        }
    });

    // Register Swagger UI.
    await fastify.register(fastifySwaggerUi,
    {
        routePrefix: ROUTE_ENDPOINTS.SWAGGER.ROOT,
        uiConfig:
        {
            docExpansion: 'list',
            deepLinking : false
        }
    });
});

export default swaggerPlugin;
