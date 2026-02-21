import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";
import fastifyCookie from "@fastify/cookie";
import { VAMPIFY_LITERALS } from "../vampify-literals.js";
import { FastifyInstance, FastifyRequest, FastifyReply, FastifySchema } from "fastify";
import { createHash } from "node:crypto";


export type VampifyAuthPayload = {
  user_id     : string,
  foot_print  : string
};


/**
 * Create a Digital Footprint.
 * 
 * This function gets the ip address and the user-agent
 * of the request, and creates a digital footprint to 
 * make it harder XSS hackers.
 * 
 * @param req The FastifyRequest object.
 * @returns The footprint hash that was created
 */
export function vampifyCreateFootprint(req: FastifyRequest): string
{
    const raw: string = `${req.ip}-${req.headers["user-agent"]}`;
    return createHash("sha256").update(raw).digest("hex");
}


/**
 * Sign The Payload.
 * 
 * This function signs the payload.
 * 
 * @param user_id The user id that was logged in.
 * @param req The FastifyRequest object.
 * @param rep The FastifyReply object.
 */
export async function vampifySignPayload<S extends FastifySchema = FastifySchema>
(rep: FastifyReply<any, any, any, any, S>, user_id: string, body?: any): Promise<void>
{
  // Get the fastify server.
  const fastify: FastifyInstance = rep.server;

  // Create the payload object.
  const payload: VampifyAuthPayload = {
    user_id     : user_id,
    foot_print  : vampifyCreateFootprint(rep.request)
  };

  // Sign the payload.
  const token: string = await rep.jwtSign(payload, {
      sign: {expiresIn: fastify.getEnvs().JWT_EXPIRES}
    }
  );

  //Reply back and store it in HttpOnly cookie (CORS Disabled!!!)
  rep
    .setCookie(VAMPIFY_LITERALS.PAYLOAD_COOKIE_NAME, token, {
      path    : "/", // This insures the browser sends the cookie to every endpoint!
      httpOnly: true,
      secure  : fastify.vampifyIsProdMode(),
      sameSite: "strict",
      maxAge  : fastify.getEnvs().JWT_EXPIRES
    })
    .send(body);
}



/**
 * Authenticate.
 * 
 * Authenticate an attempt login
 * 
 * @param req The FastifyRequest object.
 * @param rep The FastifyReply object.
 * @returns An http reply
 */
export async function vampifyAuthenticate(req: FastifyRequest, res: FastifyReply): Promise<void>
{
  const fastify: FastifyInstance = req.server;

  const nativeApiKey = req.headers["x-vampify-native-key"];

  // Native App (Private Key)
  if (typeof nativeApiKey === "string" && nativeApiKey)
  {
    // Placeholder logic: Currently blocks access until DB check is implemented
    // Change this once you have your DB lookup ready.
    const isKeyValid = false; // TODO: Implement DB check

    // Check the API key.
    if (!isKeyValid)
    {
      req.log.error("vampifyAuthenticate() failed due to invalid x-vampify-native-key");
      return res.unauthorized(fastify.vampifyIsDevMode() ? "x-vampify-native-key verification failed." : "Unauthorized");
    }
  }

  // Browser
  else
  {
    // Try to verify the JWT payload and the digital footprint.
    try
    {
      // Extract from cookie automatically via @fastify/jwt
      const payload: VampifyAuthPayload = await req.jwtVerify();

      // Verify Footprint
      if ( payload.foot_print !== vampifyCreateFootprint(req) )
      {
        req.log.error("vampifyAuthenticate() failed due to failure in digital footprint validation.");

        // We do not redirect here, because if the footprint breaks then its an XSS ATTACK!!!
        return res.unauthorized(fastify.vampifyIsDevMode() ? "Footprint verification failed" : "Unauthorized");
      }

      //Assign the payload to the request object.
      req.vampify_payload = payload;
    }
    
    // Authentication failed due to JWT verification.
    catch (err)
    {
      req.log.error(`vampifyAuthenticate() failed: ${err instanceof Error ? err.message : 'JTW verification failed.'}`);

      // If it's a GET request send them to login.
      if (req.method === 'GET')
      {
        return res.redirect(fastify.getEnvs().AUTH_REDIRECT);
      }

      return res.unauthorized(fastify.vampifyIsDevMode() ? "JTW Payload verification failed or expired" : "Unauthorized");
    }
  }
}



const vampifyAuthenticationPlugin = fp(async (fastify: FastifyInstance) =>
{
  // Register JWT.
  fastify.register(fastifyJwt, {
    secret: fastify.getEnvs().JWT_SECRET,
    cookie: {
      cookieName: VAMPIFY_LITERALS.PAYLOAD_COOKIE_NAME,
      signed: false,
    },
  });

  // Register Cookie support.
  fastify.register(fastifyCookie);

  // Request Decorator vampify_payload.
  fastify.decorateRequest("vampify_payload", null);

  // Decorate vampifyAuth() function.
  fastify.decorate("vampifyAuth", vampifyAuthenticate);

  // Request Decorator vampifyCreateFootprint().
  fastify.decorateRequest("vampifyCreateFootprint", function (this: FastifyRequest) {
    return vampifyCreateFootprint(this);
  });

  // Reply Decorator vampifySignPayload().
  fastify.decorateReply("vampifySignPayload", function (this: FastifyReply, user_id: string, body?: any)
  {
    return vampifySignPayload(this, user_id, body);
  });
});


declare module 'fastify' {

  interface FastifyInstance {

   /**
   * Authenticate.
   * 
   * Authenticate an attempt login.
   * 
   * Example usage in a route:
   *     fastify.get("/login", {preHandler: [fastify.vampifyAuth]}, async (req, rep)=>...)
   * 
   * @param req The FastifyRequest object.
   * @param rep The FastifyReply object.
   */
    vampifyAuth(req: FastifyRequest, rep: FastifyReply): Promise<void>;
  }

  interface FastifyRequest {

   /**
   * Create a Digital Footprint.
   * 
   * This function gets the ip address and the user-agent
   * of the request, and creates a digital footprint to 
   * make it harder XSS hackers.
   * 
   * @returns The footprint hash that was created
   */
    vampifyCreateFootprint(): string;

   /**
   * The payload object. It should contain the payload object after the
   * {preHandler: [fastify.vampifyAuth]} succeeds.
   */
    vampify_payload?: VampifyAuthPayload | null;
  }

  interface FastifyReply {

   /**
   * Sign The Payload.
   * 
   * This function signs the payload.
   * 
   * @param user_id The user id that was logged in.
   */
    vampifySignPayload(user_id: string, body?: any): Promise<void>;
  }
}


export default vampifyAuthenticationPlugin;

