export const ROUTE_ENDPOINTS =
{
    ROOT:
    {
        ROOT    : "/",
    },

    HEALTH:
    {
        ROOT : '/health'
    },

    CREDENTIALS:
    {
        ROOT            : "/credentials-login",
        CHECK_PAYLOAD   : "/credentials-check-payload",
        FULL_PAYLOAD_OPTIONS: "/credentials/full-payload-options"
    },

    SWAGGER:
    {
        ROOT: "/docs"
    },

    UTILITIES:
    {
        ROOT            : "/utilities",
        ABORT_ENDPOINT  : "/utilities/abort-end-point"
    }
} as const;
