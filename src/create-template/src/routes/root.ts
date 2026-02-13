import { FastifyPluginAsync, FastifyInstance, FastifyPluginOptions } from "fastify";

const root: FastifyPluginAsync = async (fastify: FastifyInstance, opts: FastifyPluginOptions): Promise<void>=>
{
    fastify.get("/", (req, res)=>
    {
        return "Hello Vampify!";
    });
};

export default root;
