/**
 * dashboard.js (routes) — Aggregate statistics
 * GET /api/dashboard/stats
 */

"use strict";

const express = require("express");
const { PrismaClient } = require("@prisma/client");
const requireAuth = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

router.get("/stats", async (req, res, next) => {
  try {
    const [bidders, checks, tenders] = await Promise.all([
      prisma.bidder.findMany({
        select: { status: true, risk: true, score: true, blockchainTxId: true, tenderId: true, tenderName: true },
      }),
      prisma.check.findMany({ select: { state: true } }),
      prisma.tender.findMany({ select: { tenderId: true, name: true } }),
    ]);

    const countBy = (arr, key) =>
      arr.reduce((acc, item) => {
        acc[item[key]] = (acc[item[key]] || 0) + 1;
        return acc;
      }, {});

    const byStatus  = countBy(bidders, "status");
    const byRisk    = countBy(bidders, "risk");
    const checkDist = countBy(checks, "state");

    const scores = bidders.map(b => b.score).filter(s => s !== null);
    const avgScore = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

    const scoreDistribution = {
      "0–24":   scores.filter(s => s < 25).length,
      "25–49":  scores.filter(s => s >= 25 && s < 50).length,
      "50–79":  scores.filter(s => s >= 50 && s < 80).length,
      "80–100": scores.filter(s => s >= 80).length,
    };

    // Blockchain stats
    const blockchainRegistered = bidders.filter(b => b.blockchainTxId).length;

    // Tender health summary
    const tenderHealth = tenders.map(t => {
      const tb = bidders.filter(b => b.tenderId === t.tenderId);
      return {
        tenderId: t.tenderId,
        name: t.name,
        total: tb.length,
        approved: tb.filter(b => b.status === "approved").length,
        rejected: tb.filter(b => b.status === "rejected").length,
        pending: tb.filter(b => b.status === "pending_review").length,
        avgScore: tb.filter(b => b.score !== null).length
          ? Math.round(tb.filter(b => b.score !== null).reduce((s, b) => s + b.score, 0) / tb.filter(b => b.score !== null).length)
          : null,
      };
    });

    res.json({
      total: bidders.length,
      byStatus: {
        approved:       byStatus.approved       || 0,
        pending_review: byStatus.pending_review || 0,
        rejected:       byStatus.rejected       || 0,
      },
      byRisk: {
        low:    byRisk.low    || 0,
        medium: byRisk.medium || 0,
        high:   byRisk.high   || 0,
      },
      avgScore,
      scoreDistribution,
      checkStateDistribution: {
        pass:    checkDist.pass    || 0,
        warn:    checkDist.warn    || 0,
        missing: checkDist.missing || 0,
        fail:    checkDist.fail    || 0,
        na:      checkDist.na      || 0,
      },
      blockchainRegistered,
      tenderHealth,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/checks/export — CSV export of all checks across all bidders
router.get("/checks/export", requireAuth, async (req, res, next) => {
  try {
    const checks = await prisma.check.findMany({
      include: { bidder: { select: { name: true, gstin: true, tenderId: true } } },
      orderBy: { createdAt: "desc" },
    });

    let csv = "Bidder Name,GSTIN,Tender ID,Check Label,Category,State,Weight,Live,Note\n";
    for (const c of checks) {
      const row = [
        `"${(c.bidder?.name || "").replace(/"/g, '""')}"`,
        `"${c.bidder?.gstin || ""}"`,
        `"${c.bidder?.tenderId || ""}"`,
        `"${c.label.replace(/"/g, '""')}"`,
        c.category,
        c.state,
        c.weight,
        c.live ? "Yes" : "No",
        `"${(c.note || "").replace(/"/g, '""')}"`,
      ];
      csv += row.join(",") + "\n";
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="Praman_Compliance_Checks.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
