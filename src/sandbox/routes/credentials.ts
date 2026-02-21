import { FastifyPluginAsync } from "fastify";

const credentials: FastifyPluginAsync = async (fastify, opts): Promise<void> =>
{
    const mocked_user = {user_id: "1"};

    fastify.get("/credentials-login", async (req,res)=>
    {
        await res.vampifySignPayload(mocked_user.user_id);
    });


    fastify.get("/credentials-check-payload", {preHandler: [fastify.vampifyAuth]}, async (req,res)=>
    {
        const payload = req.vampify_payload;

        if (!payload)
        {
            throw fastify.httpErrors.unauthorized({message: "Payload is null, which it shouldn't be at this stage!!!"});
        }

        else if (payload.user_id !== mocked_user.user_id)
        {
            throw fastify.httpErrors.unauthorized({message: "Payload user_id, is not the user we expected to be!!!"});
        }

        else
        {
            res.status(200).send("Payload checked successfully!");
        }
    });
};

export default credentials;
