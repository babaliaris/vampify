import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { VAMPIFY_LITERALS } from "@vampify/literals";
import { ROUTE_ENDPOINTS } from "../literals.js"

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
                    // Native Apps (API Key in Header)
                    apiKeyAuth:
                    {
                        type        : 'apiKey',
                        in          : 'header',
                        name        : VAMPIFY_LITERALS.NATIVE_API_KEY_NAME,
                        description : 'API Key for native/mobile application access'
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
