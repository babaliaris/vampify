import { FastifyPluginAsync } from "fastify";
import {VampifyInstance} from "@vampify/literals";

const root: FastifyPluginAsync = async (fastify: VampifyInstance): Promise<void>=>
{
    fastify.get("/", (req, res)=>
    {
        return "Hello Vampify!";
    });
};

export default root;
