/**
 * bidder.schema.js — Zod schemas for bidder-related request bodies
 */

"use strict";

const { z } = require("zod");

// POST /api/bidders/:id/decision
const DecisionSchema = z.object({
  action: z.enum(["approve", "reject", "flag_review", "overturn"], {
    errorMap: () => ({ message: "action must be 'approve', 'reject', 'flag_review', or 'overturn'" }),
  }),
});

// Query params for GET /api/bidders
const BidderListQuerySchema = z.object({
  status: z.enum(["approved", "rejected", "pending_review", "flagged_for_review"]).optional(),
  risk:   z.enum(["low", "medium", "high"]).optional(),
  q:      z.string().max(100).optional(),
});

module.exports = { DecisionSchema, BidderListQuerySchema };
