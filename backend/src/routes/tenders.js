/**
 * tenders.js — /api/tenders/* endpoints
 */

"use strict";

const express = require("express");
const { PrismaClient } = require("@prisma/client");
const requireAuth  = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

// ─── GET /api/tenders ─────────────────────────────────────────────────────────

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const { q } = req.query;
    
    // Support basic searching by tender name or id
    const where = q ? {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { tenderId: { contains: q, mode: "insensitive" } }
      ]
    } : {};

    const tenders = await prisma.tender.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { bidders: true }
        }
      }
    });

    // Also get status breakdown per tender
    // A raw query or aggregation is best here, or just fetch all grouped by status
    const statusCounts = await prisma.bidder.groupBy({
      by: ['tenderId', 'status'],
      _count: { id: true }
    });

    // Format tenders with status counts
    const formattedTenders = tenders.map(t => {
      const counts = statusCounts.filter(sc => sc.tenderId === t.tenderId);
      const approved = counts.find(c => c.status === 'approved')?._count.id || 0;
      const pending = counts.find(c => c.status === 'pending_review')?._count.id || 0;
      const rejected = counts.find(c => c.status === 'rejected')?._count.id || 0;
      
      return {
        ...t,
        totalBidders: t._count.bidders,
        approved,
        pending_review: pending,
        rejected
      };
    });

    res.json(formattedTenders);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/tenders/:tenderId/bidders ──────────────────────────────────────

router.get("/:tenderId/bidders", requireAuth, async (req, res, next) => {
  try {
    const { tenderId } = req.params;
    const { status, risk } = req.query;
    
    const tender = await prisma.tender.findUnique({
      where: { tenderId }
    });
    
    if (!tender) return res.status(404).json({ error: "Tender not found." });

    const where = {
      tenderId,
      ...(status ? { status } : {}),
      ...(risk   ? { risk }   : {}),
    };

    const bidders = await prisma.bidder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, gstin: true, pan: true, udyam: true,
        tenderId: true, tenderName: true, score: true, risk: true,
        status: true, recommendation: true, createdAt: true, updatedAt: true,
        _count: { select: { checks: true, documents: true } },
      },
    });

    res.json({ tender, bidders, total: bidders.length });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
