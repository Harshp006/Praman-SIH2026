/**
 * dashboard.js (routes) — Aggregate statistics
 * GET /api/dashboard/stats
 */

"use strict";

const express = require("express");
const { PrismaClient } = require("@prisma/client");

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/dashboard/stats
 * Returns aggregated counts, score distribution, and check state breakdown.
 * No auth required — Layer 3 renders the public dashboard.
 */
router.get("/stats", async (req, res, next) => {
  try {
    const [bidders, checks] = await Promise.all([
      prisma.bidder.findMany({
        select: { status: true, risk: true, score: true, hardGated: true },
      }),
      prisma.check.findMany({ select: { state: true } }),
    ]);

    // Count helpers
    const countBy = (arr, key) =>
      arr.reduce((acc, item) => {
        acc[item[key]] = (acc[item[key]] || 0) + 1;
        return acc;
      }, {});

    const byStatus   = countBy(bidders, "status");
    const byRisk     = countBy(bidders, "risk");
    const checkDist  = countBy(checks,  "state");
    const hardGated  = bidders.filter(b => b.hardGated).length;
    const scores     = bidders.map(b => b.score);
    const avgScore   = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

    // Score buckets for a histogram
    const scoreDistribution = {
      "0–24":   scores.filter(s => s < 25).length,
      "25–49":  scores.filter(s => s >= 25 && s < 50).length,
      "50–74":  scores.filter(s => s >= 50 && s < 75).length,
      "75–100": scores.filter(s => s >= 75).length,
    };

    res.json({
      total:    bidders.length,
      byStatus: {
        approved:     byStatus.approved     || 0,
        under_review: byStatus.under_review || 0,
        rejected:     byStatus.rejected     || 0,
      },
      byRisk: {
        low:    byRisk.low    || 0,
        medium: byRisk.medium || 0,
        high:   byRisk.high   || 0,
      },
      hardGated,
      avgScore,
      scoreDistribution,
      checkStateDistribution: {
        pass:    checkDist.pass    || 0,
        warn:    checkDist.warn    || 0,
        missing: checkDist.missing || 0,
        fail:    checkDist.fail    || 0,
        na:      checkDist.na      || 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
