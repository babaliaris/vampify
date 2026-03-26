import fp from "fastify-plugin";
import { VAMPIFY_DEBUG_MSG } from "../vampify-literals.js";
import { FastifyInstance } from "fastify";



const STATUS_TO_REASON: Record<number, keyof typeof VAMPIFY_DEBUG_MSG.REASON> =
{
    400: VAMPIFY_DEBUG_MSG.REASON.BAD_REQUEST,
    401: VAMPIFY_DEBUG_MSG.REASON.UNAUTHORIZED,
    403: VAMPIFY_DEBUG_MSG.REASON.FORBIDDEN,
    404: VAMPIFY_DEBUG_MSG.REASON.NOT_FOUND,
    409: VAMPIFY_DEBUG_MSG.REASON.CONFLICT,
    413: VAMPIFY_DEBUG_MSG.REASON.PAYLOAD_TOO_LARGE,
    422: VAMPIFY_DEBUG_MSG.REASON.VALIDATION_FAILED,
    429: VAMPIFY_DEBUG_MSG.REASON.TOO_MANY_REQUESTS,
    500: VAMPIFY_DEBUG_MSG.REASON.INTERNAL_SERVER_ERROR,
    503: VAMPIFY_DEBUG_MSG.REASON.SERVICE_UNAVAILABLE
};



function abortEndpoint(fastify: FastifyInstance, condition: any, status: number, debugMsg: string, payload?: any): void
{
    // Make sure, that in production mode the debug msg IS NOT LEAKED!
    const reason    = STATUS_TO_REASON[status] || VAMPIFY_DEBUG_MSG.REASON.INTERNAL_SERVER_ERROR;
    const finalMsg  = fastify.vampifyIsProdMode() ? reason : debugMsg;

    // If condition is true, return.
    if (condition) return;

    // Error.
    if (status >= 500)
    {
        fastify.log.error(
        {
            reason  : reason,
            status  : status,
            payload : payload
        }, debugMsg);
    }
    
    // Warning.
    else
    {
        fastify.log.warn(
        {
            reason  : reason,
            status  : status,
            payload : payload
        }, debugMsg);
    }

    // Get the appropriate @fastify/sensible error based on the status code.
    const error = fastify.httpErrors.getHttpError(status as any, finalMsg);

    throw error;
};



const vampifyUtilitiesPlugin = fp(async (fastify: FastifyInstance) =>
{
    // Decorate abortEndpoint().
    fastify.decorate('vampifyAbort', function (condition: any, status: number, debug_msg: string, payload?: any): void
    {
        abortEndpoint(fastify, condition, status, debug_msg, payload);
    });
});




declare module 'fastify' {

  interface FastifyInstance
  {
    /**
     * Aborts the endpoint by throwing a @fastify/sensible HTTP error.
     * 
     * This function uses fastify.log() to log internally the debug_msg
     * & the payload BUT it GUARANTEES in production mode, that debug_msg
     * will not LEAK! Otherwise, the debug_msg will be used for the response as well.
     * 
     * It works like an ASSERTION !
     * 
     * @param condition If falsey, the enpoint is aborted (The error is thrown)!
     * @param status The HTTP error code you want to throw.
     * @param debug_msg The debug message for the response & the internal logging.
     * @param payload A payload object for the internal logging.
     */
    vampifyAbort<T>(condition: T | null | undefined | false, status: number, debug_msg: string, payload?: any): asserts condition;
  }
}


export default vampifyUtilitiesPlugin;
