import fp from "fastify-plugin";
import corsPlugin from '@fastify/cors';

const crossOriginPlugin = fp((fastify)=>
{
    fastify.register(corsPlugin,
    {
        origin: (origin, cb) =>
        {
            // Always allow server-to-server or tools like Postman (no origin)
            if (!origin)
            {
                cb(null, true);
                return;
            }

            // Production: Strict check
            if ( fastify.vampifyIsProdMode() )
            {
                // Allowed domains.
                const allowedProd =
                [
                    "https://your-production-app.com"
                ];

                if (allowedProd.includes(origin))
                {
                    cb(null, true);
                }
                
                else
                {
                    cb(new Error("CORS Violation"), false);
                }

                return;
            }

            // Development: Reflective allow (handles changing IPs)
            cb(null, true);
        },
        credentials : true,
        methods     : ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
    });
});

export default crossOriginPlugin;
