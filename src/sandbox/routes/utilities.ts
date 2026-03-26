import { FastifyPluginAsync } from "fastify";
import { VampifyInstance } from "@/core/vampify-literals.js";
import { ROUTE_ENDPOINTS, } from "../literals.js";
import { VampifyStandardResponseErrors } from "@/core/vampify-literals.js";
import { Type } from "@sinclair/typebox";

const root: FastifyPluginAsync = async (fastify: VampifyInstance): Promise<void> =>
{
    fastify.post(ROUTE_ENDPOINTS.UTILITIES.ABORT_ENDPOINT,
    {
        schema:
        {
            body: Type.Object(
            {
                status      : Type.Number(),
                debug_msg   : Type.String(),
                payload     : Type.Optional(Type.Any())
            }),

            response:
            {
                ...VampifyStandardResponseErrors
            }
        }
    },
    async (req, rep) =>
    {
        return fastify.vampifyAbortEndpoint(
            req.body.status,
            req.body.debug_msg,
            req.body.payload
        );
    });
};

export default root;
