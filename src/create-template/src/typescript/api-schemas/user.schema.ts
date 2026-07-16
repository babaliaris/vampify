import { Type, Static } from '@sinclair/typebox';
import { id, created_at } from './standards.schema.js';

const email = Type.String(
{
  format      : "email",
  maxLength   : 255,
  description : "The user's email address",
});


const password = Type.String(
{
  maxLength   : 255,
  description : "The user's password",
});

const verification_hash = Type.String(
{
  description: "The account verification hash"
});

const is_verified = Type.Boolean(
{
  description: "True if the email has been verified"
});


export const UserRoleSchema = Type.Union(
[
  Type.Literal("ADMIN"),
  Type.Literal("PROFESSOR"),
  Type.Literal("STUDENT"),
  Type.Literal("GUEST")
], { description: "The role of this user" });


export const UserGetSchema = Type.Object(
{
  id                : id,
  email             : email,
  role              : UserRoleSchema,
  is_verified       : Type.Optional(is_verified),
  created_at        : created_at
});

export const UserPostSchema = Type.Object(
{
  email             : email,
  password          : password,
  verification_hash : Type.Optional(verification_hash),
  is_verified       : Type.Optional(is_verified),
});


// Login Schema
export const UserLoginSchema = Type.Object(
{
  email: Type.String(
  {
    description : "The email address of the user."
  }),

  password: Type.String(
  {
    description : "The user's password."
  })
});




export const UserProfileStatisticsSchema = Type.Object(
{
  email: Type.String(
  {
    format      : 'email',
    description : "Must be a valid email address" 
  }),

  is_verified: Type.Optional(Type.Boolean(
  {
    description: "True if the email has been verified"
  })),

  school: Type.Optional(Type.String(
  {
    maxLength   : 255,
    description : "The schoold that the user attempts"
  })),

  department: Type.Optional(Type.String(
  {
    maxLength   : 255,
    description : "The specific department of the school"
  })),

  occupation: Type.Optional(Type.String(
  {
    maxLength   : 255,
    description : "The occupation of the user."
  })),

  year_or_reason: Type.Optional(Type.String(
  {
    maxLength   : 255,
    description : "The years of study so far, or another reason"
  })),

  first_name: Type.Optional(Type.String(
  {
    maxLength   : 255,
    description : "The user name"
  })),

  last_name: Type.Optional(Type.String(
  {
    maxLength   : 255,
    description : "The user last name (surname)"
  })),

  created_at : Type.Optional(Type.String(
  {
    format: "date",
    description: "Metadata for the creation of this object"
  })),

  total_projects: Type.Optional(Type.Number(
  {
    description: "The total number of projects for this user"
  })),

  total_entries: Type.Optional(Type.Number(
  {
    description: "The total event entries for this user"
  }))
});

export type UserRoleType              = Static<typeof UserRoleSchema>;
export type UserPostType              = Static<typeof UserPostSchema>;
export type UserGetType               = Static<typeof UserGetSchema>;
export type UserLoginType             = Static<typeof UserLoginSchema>;
export type UserProfileStatisticsType = Static<typeof UserProfileStatisticsSchema>;


export type JwtPayloadType =
{
  m_user: UserGetType
};

