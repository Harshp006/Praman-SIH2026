/**
 * bidder.schema.js — Zod schemas for bidder-related request bodies
 */

"use strict";

const { z } = require("zod");

// POST /api/bidders/:id/decision — spec only allows approve or reject
const DecisionSchema = z.object({
  action: z.enum(["approve", "reject"], {
    errorMap: () => ({ message: "action must be 'approve' or 'reject'" }),
  }),
});

// Query params for GET /api/bidders
const BidderListQuerySchema = z.object({
  status: z.enum(["approved", "rejected", "pending_review"]).optional(),
  risk:   z.enum(["low", "medium", "high"]).optional(),
  q:      z.string().max(100).optional(),
});

module.exports = { DecisionSchema, BidderListQuerySchema };
