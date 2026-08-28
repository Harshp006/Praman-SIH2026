/**
 * validate.js — Zod schema validation middleware factory
 *
 * Usage: router.post('/login', validate(LoginSchema), handler)
 * On failure → 400 with structured field errors.
 */

"use strict";

/**
 * @param {import('zod').ZodSchema} schema
 * @param {'body'|'query'|'params'} [source='body']
 */
module.exports = function validate(schema, source = "body") {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      return res.status(400).json({
        error:   "Validation failed",
        details: result.error.flatten().fieldErrors,
      });
    }

    // Replace with coerced/parsed values
    req[source] = result.data;
    next();
  };
};
