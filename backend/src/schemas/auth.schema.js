/**
 * auth.schema.js — Zod schema for auth routes
 */

"use strict";

const { z } = require("zod");

const LoginSchema = z.object({
  email:    z.string().email("Must be a valid email address"),
  password: z.string().min(1, "Password is required"),
});

module.exports = { LoginSchema };
