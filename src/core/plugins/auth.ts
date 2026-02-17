import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";
import fastifyCookie from "@fastify/cookie";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { createHash } from "node:crypto";

export default fp(async (fastify: FastifyInstance) =>
{
  //Register JWT.
  fastify.register(fastifyJwt, {
    secret: fastify.getEnvs().JWT_SECRET,
    cookie: {
      cookieName: "vampify_token",
      signed: false,
    },
  });

  // Register Cookie support.
  fastify.register(fastifyCookie);

  // Helper: Generate Digital Footprint
  const getFootprint = (req: FastifyRequest) =>
  {
    const raw = `${req.ip}-${req.headers["user-agent"]}`;
    return createHash("sha256").update(raw).digest("hex");
  };

  // The Authentication Decorator
  fastify.decorate("authenticate", async (req: FastifyRequest, rep: FastifyReply) =>
  {
    const nativeApiKey = req.headers["x-vampify-native-key"];

    // --- Path A: Native App (Private Key) ---
    if (nativeApiKey)
    {
        // TODO Implement this function using private keys stored in a database.
      /*
      if (nativeApiKey !== PRIVATE_APP_KEY)
      {
        return reply.status(401).send({ error: "Invalid Private Key" });
      }
     */
      throw Error("Native api key not implemnted yet.");
    }

    // --- Path B: Browser (JWT + Cookie + Footprint) ---
    try
    {
      // Extract from cookie automatically via @fastify/jwt
      const decoded: any = await req.jwtVerify();
      
      // Verify Footprint
      if (decoded.fpt !== getFootprint(req)) {
        return rep.status(401).send({ error: "Security footprint mismatch" });
      }
    }
    
    catch (err)
    {
      return rep.status(401).send({ error: "Unauthorized" });
    }
  });
});