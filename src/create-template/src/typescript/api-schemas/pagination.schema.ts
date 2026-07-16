import { Type, TSchema } from "@sinclair/typebox";

export const m_page = Type.Integer(
{
      description: "The page number to be fetched",
      minimum: 0,
      default: 0
});

export const m_limit = Type.Integer(
{
      description: "The number of rows to be fetched",
      minimum: 1,
      maximum: 100,
      default: 100
});

export const m_search = Type.Optional(Type.String(
{
  description : "Search pattern to filter the results (starts with)"
}));


export const StdPaginationQuerySchema = Type.Object(
{
  m_page  : m_page,
  m_limit : m_limit,
  m_search: m_search
});


export const StdPaginationMetaDataSchema = Type.Object(
{
  m_total_pages:  Type.Number(
  {
        description : "The total number of pages",
        minimum     : 1
  }),

  m_current_page: Type.Number(
  {
        description: "The current page you're looking at",
        minimum: 0
  }),

  m_limit: Type.Integer(
  {
        description: "The number of rows you requested",
        minimum: 1,
        maximum: 100
  })
});



export function stdPaginationReplySchema<T extends TSchema>(data_schema: T)
{
  return Type.Object(
  {
    m_data: Type.Array(data_schema,
    {
          description: "The list of the returned objects"
    }),

    m_meta: StdPaginationMetaDataSchema
  });
}
