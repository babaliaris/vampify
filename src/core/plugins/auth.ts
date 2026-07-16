import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";
import fastifyCookie from "@fastify/cookie";
import { VAMPIFY_LITERALS } from "../vampify-literals.js";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { createHash, timingSafeEqual } from "node:crypto";
import bcrypt from 'bcrypt';


export type VampifyAuthPayload<T = any> =
{
  user_id     : string,
  foot_print  : string,
  user_role  ?: string,
  data       ?: T
};

export type VampifyAuthSignOptionsType<Tjwt> =
{
  device_id ?: string,
  expires   ?: number,
  jwt_data  ?: Tjwt,
  user_role ?: string
};


/**
 * 
 * @param password The word to be hashed.
 * @returns The hashed string.
 */
export const vampifyHashCreate = async (password: string): Promise<string> =>
{
    return await bcrypt.hash(password, 12);
};


/**
 * 
 * @param password The word to be compared
 * @param hash The hash to be compared
 * @returns True on success, false otherwise.
 */
export const vampifyHashCompare = async (password: string, hash: string): Promise<boolean> =>
{
    return await bcrypt.compare(password, hash);
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
export function vampifyCreateFootprint(req: FastifyRequest, device_id?: string): string
{
  // Get user agent for browsers, uknown otherwise.
  const userAgent = req.headers["user-agent"] || "unknown-ua";

  // If a deviceId is provided (from the mobile login), we use that instead of the IP address.
  const identifier = device_id ? device_id : req.ip;

  // Create the string and returned a hashed version of it.
  const raw: string = `${identifier}-${userAgent}`;
  return createHash("sha256").update(raw).digest("hex");
}


/**
 * Sign The Payload.
 * 
 * This function signs the payload. If device_id is
 * provided, then we return the JTW token in the body
 * property of the reply, otherwise as an HttpOnly cookie.
 * 
 * @param rep The FastifyReply object.
 * @param user_id The user id that was logged in.
 * @param body A custom payload to be returned in the response.
 * @param options An options object with extra config properties.
 * 
 * @returns The fastify reply object.
 */
export async function vampifySignPayload<Tbody = any, Tjwt = any>(
  rep     : FastifyReply, user_id: string, body?: Tbody,
  options?: VampifyAuthSignOptionsType<Tjwt>
): Promise<FastifyReply>
{
  // Get the fastify server.
  const fastify: FastifyInstance = rep.server;

  // Create the payload object.
  const payload: VampifyAuthPayload<Tjwt> =
  {
    user_id     : user_id,
    foot_print  : vampifyCreateFootprint(rep.request, options?.device_id),
    user_role   : options?.user_role,
    data        : options?.jwt_data
  };

  // Sign the payload.
  const token: string = await rep.jwtSign(payload,
  {
      sign: { expiresIn: options?.expires || fastify.getEnvs().JWT_EXPIRES }
  });

  // For native apps (mobile), send the
  // token in the json response.
  if (options?.device_id) return rep.send(
  {
    token : token,
    body  : body
  });

  //For browsers, send the token in an HTTP Only Cookie.
  return rep
    .setCookie(VAMPIFY_LITERALS.PAYLOAD_COOKIE_NAME, token,
    {
      path        : "/", // This insures the browser sends the cookie to every endpoint!
      httpOnly    : true,
      secure      : true, // Https is required!!!
      partitioned : true,
      sameSite    : "none", // None, requires HTTPS!!!
      maxAge      : options?.expires || fastify.getEnvs().JWT_EXPIRES
    })
    .send(
    {
      token : null,
      body  : body
    });
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

  // Try to verify the JWT payload and the digital footprint.
  try
  {
    // JWT is smart enough to know if the token is in a Bearer header or in an HTTP only cookie.
    let payload: VampifyAuthPayload = await req.jwtVerify();

    // Verify Footprint
    const device_id = req.headers[VAMPIFY_LITERALS.X_NATIVE_DEVICE_ID]; // Get the device ID it it exists.
    if ( payload.foot_print !== vampifyCreateFootprint(req, typeof device_id === "string" ? device_id : undefined) )
    {
      req.log.error("vampifyAuthenticate() failed due to failure in digital footprint validation.");

      return res.unauthorized(fastify.vampifyIsDevMode() ? "Footprint verification failed" : "Unauthorized");
    }

    //Assign the payload to the request object.
    req.vampify_payload = payload;
  }

  // Authentication failed due to JWT verification.
  catch (err)
  {
    req.log.error(`vampifyAuthenticate() failed: ${err instanceof Error ? err.message : 'JTW verification failed.'}`);

    return res.unauthorized(fastify.vampifyIsDevMode() ? "JTW Payload verification failed or expired" : "Unauthorized");
  }
}


/**
 * Guard for background service scripts using a static API Key.
 * Bypasses JWT and Footprint validation entirely.
 */
export async function vampifyServiceAuthenticator(req: FastifyRequest, res: FastifyReply): Promise<void>
{
  // Get the server instance.
  const fastify = req.server;

  // Extract key from 'X-Service-API-Key' header
  const apiKey = req.headers[VAMPIFY_LITERALS.X_SERVICE_API_KEY];

  // Check if the key exists and its a string.
  if (typeof apiKey !== "string")
  {
    const debug_msg = `Missing ${VAMPIFY_LITERALS.X_SERVICE_API_KEY}`;
    const rep_msg   = fastify.vampifyIsProdMode()
      ? `Unauthorized`
      : debug_msg;

    req.log.warn(debug_msg);
    return res.unauthorized(rep_msg);
  }

  // Get and check the required key.
  const expectedKey = process.env.LOG_SHIPPER_KEY;
  if (!expectedKey)
  {
    const debug_msg = `Missing ${VAMPIFY_LITERALS.X_SERVICE_API_KEY}`;
    const rep_msg   = fastify.vampifyIsProdMode()
      ? `Server Configuration Error`
      : debug_msg;

    req.log.error(debug_msg);
    return res.internalServerError(rep_msg);
  }

  // Try to check the api key hash with the expected one
  // that lives in the environment variables.
  try
  {
    // timingSafeEqual requires buffers of equal length to prevent timing attacks.
    // If the lengths don't match, we fail early to prevent buffer errors.
    if (apiKey.length !== expectedKey.length)
    {
      return res.unauthorized(`Invalid API Key (${VAMPIFY_LITERALS.X_SERVICE_API_KEY})`);
    }

    // Constant-time comparison to prevent timing attacks
    const isMatch = timingSafeEqual(
      Buffer.from(apiKey, 'utf-8'),
      Buffer.from(expectedKey, 'utf-8')
    );

    if (!isMatch)
    {
      return res.unauthorized(`Invalid API Key (${VAMPIFY_LITERALS.X_SERVICE_API_KEY})`);
    }

    // Auth succeeded! Attach a dummy system payload to keep TS happy if needed
    req.vampify_payload =
    {
      user_id   : "system-logger-service",
      foot_print: "bypass",
      data      :
      {
        is_system: true
      }
    };
  }

  // Something went wrong.
  catch (err)
  {
    const debug_msg = `Unauthorized access to ${VAMPIFY_LITERALS.X_SERVICE_API_KEY}`;
    const rep_msg   = fastify.vampifyIsProdMode()
      ? `Unauthorized`
      : debug_msg;

    req.log.warn(err, debug_msg);

    return res.unauthorized(rep_msg);
  }
}


/**
 * A PreHandler Factory that creates a role-based guard.
 * It assumes vampifyAuth has already run and populated req.vampify_payload.
 */
function requireRoles<TUserRoleType = any>(
    roles: TUserRoleType[] | TUserRoleType)
{
  const rolesArray = Array.isArray(roles) ? roles : [roles];

  return async (req: FastifyRequest) =>
  {
    // Check that the payload and jtw data are defined.
    req.vampifyAbort(
      req.vampify_payload && req.vampify_payload.user_role,
      500,
      `[requireRoles()] Payload & user_role should exist at this point.`,
      {
        roles   : rolesArray,
        actual  : "undefined",
        payload : req.vampify_payload
      }
    );

    // Get the user role.
    const user_role = req.vampify_payload?.user_role;

    // Check that the role matches.
    req.vampifyAbort(
      rolesArray.includes(user_role as TUserRoleType),
      403,
      `[requireRoles()] Access Denied: Required roles was not included in the roles array`,
      {
        roles : rolesArray,
        actual: user_role
      }
    );
  };
};




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

  // Encrypted hash creation.
  fastify.decorate('vampifyHashCreate', vampifyHashCreate);

  // Compare hash against data.
  fastify.decorate('vampifyHashCompare', vampifyHashCompare);

  // Register Cookie support.
  fastify.register(fastifyCookie);

  // Request Decorator vampify_payload.
  fastify.decorateRequest("vampify_payload", null);

  // Decorate vampifyAuth() function.
  fastify.decorate("vampifyAuth", vampifyAuthenticate);

  // Decorate vampifyServiceAuth() function.
  fastify.decorate("vampifyServiceAuth", vampifyServiceAuthenticator);

  // Decorate requrie roles.
  fastify.decorate("vampifyRequireRolesAuth", (roles: any) =>
  {
    return requireRoles(roles);
  });

  // Request Decorator vampifyCreateFootprint().
  fastify.decorateRequest("vampifyCreateFootprint", function (this: FastifyRequest) {
    return vampifyCreateFootprint(this);
  });

  // Reply Decorator vampifySignPayload().
  fastify.decorateReply("vampifySignPayload", function (
    this: FastifyReply, user_id: string, body?: any, options?: any)
  {
    return vampifySignPayload(this, user_id, body, options);
  });
});




declare module 'fastify' {

  interface FastifyInstance
  {

   /**
   * User Authenticator (GUARD).
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

    /**
    * Check the role of a user.
    *
    * This function will check the role of a user,
    * and if it's not the expected one, it will throw
    * a forbidden http error.
    *
    *  MAKE SURE TO INITIALIZE THE user_role property
    *  during vampifySignPayload(user_id, body, options)
    *  by providing the user_role optional option.
    *
    * @param role The role to be checked.
    */
  vampifyRequireRolesAuth<TUserRoleType>(roles: TUserRoleType[] | TUserRoleType):
      (req: FastifyRequest, res: FastifyReply) => Promise<void>;


  /**
   * Service Authenticator (GUARD).
   *
   * Authenticate a service api key. Make sure the
   * the request contains the x-service-api-key header.
   *
   * @param req The FastifyRequest object.
   * @param rep The FastifyReply object.
   */
    vampifyServiceAuth(req: FastifyRequest, rep: FastifyReply): Promise<void>;


    /**
     *
     * @param password The word to be hashed.
     * @returns The hashed string.
     */
    vampifyHashCreate(password: string): Promise<string>;


    /**
     *
     * @param password The word to be compared
     * @param hash The hash to be compared
     * @returns True on success, false otherwise.
     */
    vampifyHashCompare(password: string, hash: string): Promise<boolean>;
  }


  interface FastifyRequest
  {

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


  interface FastifyReply
  {

   /**
   * Sign The Payload.
   *
   * This function signs the payload. If device_id is
   * provided, then we return the JTW token in the body
   * property of the reply, otherwise as an HttpOnly cookie.
   * 
   * @param user_id The user id that was logged in.
   * @param body A custom payload to be returned in the response.
   * @param options An options object with more config properties.
   * 
   * @returns The fastify reply object.
   */
    vampifySignPayload<Tbody = any, Tjwt = any>(
      user_id : string,
      body   ?: Tbody,
      options?: VampifyAuthSignOptionsType<Tjwt>
    ): Promise<FastifyReply>;
  }
}


export default vampifyAuthenticationPlugin;

