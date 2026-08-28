/**
 * bidder.schema.js — Zod schemas for bidder-related request bodies
 */

"use strict";

const { z } = require("zod");

// PATCH /api/bidders/:id/decision
const DecisionSchema = z.object({
  action: z.enum(["approve", "reject", "flag"], {
    errorMap: () => ({ message: "action must be one of: approve, reject, flag" }),
  }),
  note: z.string().max(1000).optional(),
});

// Query params for GET /api/bidders
const BidderListQuerySchema = z.object({
  status:   z.enum(["approved", "rejected", "under_review"]).optional(),
  risk:     z.enum(["low", "medium", "high"]).optional(),
  q:        z.string().max(100).optional(),
  page:     z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

module.exports = { DecisionSchema, BidderListQuerySchema };
