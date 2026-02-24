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

    SWAGGER:
    {
        ROOT: "/docs"
    }
} as const;



export const DEBUG_MSG =
{
    REASON:
    {
        INTERNAL_SERVER_ERROR   : "INTERNAL_SERVER_ERROR",
        ANAUTHORIZED            : "ANAUTHORIZED",
        UNVERIFIED_USER         : "UNVERIFIED_USER",
        NOT_FOUND               : "NOT_FOUND"
    }
} as const;