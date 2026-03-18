import { FastifyPluginAsync } from "fastify";
import { ROUTE_ENDPOINTS } from "../literals.js";
import { VAMPIFY_LITERALS } from "@vampify/literals";

const credentials: FastifyPluginAsync = async (fastify, opts): Promise<void> =>
{
    const mocked_user = {user_id: "1"};

    // Endpoint that returns a testing payload.
    fastify.get(ROUTE_ENDPOINTS.CREDENTIALS.ROOT, async (req,res)=>
    {
        // Take the x-native-devide-id header.
        const header = req.headers[VAMPIFY_LITERALS.X_NATIVE_DEVICE_ID];

        // Get the device id value.
        const device_id: string | undefined = Array.isArray(header) ? header[0] : header;

        await res.vampifySignPayload(mocked_user.user_id, null, device_id);
    });


    // Endpoint that tests the payload.
    fastify.get(ROUTE_ENDPOINTS.CREDENTIALS.CHECK_PAYLOAD,
    {
        preHandler: [fastify.vampifyAuth]

    }, async (req,res)=>
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
