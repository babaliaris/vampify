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
                200: Type.Boolean(),
                ...VampifyStandardResponseErrors
            }
        }
    },
    async (req, rep) =>
    {
        const value = req.vampifyAbort(
            false,
            req.body.status,
            req.body.debug_msg,
            req.body.payload
        );

        return rep.send(value);
    });
};

export default root;
