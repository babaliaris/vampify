import { FastifyPluginAsync } from "fastify";
import {VampifyInstance} from "@vampify/literals";
import { ROUTE_ENDPOINTS } from "../literals.js"

const root: FastifyPluginAsync = async (fastify: VampifyInstance): Promise<void>=>
{
    fastify.get(ROUTE_ENDPOINTS.ROOT.ROOT, (req, res)=>
    {
        return "Hello Vampify!";
    });
};

export default root;
