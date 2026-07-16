import { Type } from '@sinclair/typebox';

export const id = Type.Number(
{
  description: "The unique identifier of this object"
});

export const created_at = Type.Optional(Type.String(
{
  format: "date-time",
  description: "The time when this object was created"
}));

