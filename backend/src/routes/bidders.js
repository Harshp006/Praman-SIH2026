/**
 * bidders.js (routes) — All /api/bidders/* endpoints
 *
 * GET  /api/bidders                  — list (filterable, paginated)
 * GET  /api/bidders/:id              — detail + checks + docs + audit
 * POST /api/bidders/:id/verify       — run connectors, update checks + score [auth]
 * PATCH /api/bidders/:id/decision    — approve/reject/flag + audit [auth]
 * POST /api/bidders/:id/recommend    — Ollama recommendation [auth]
 */

"use strict";

const express  = require("express");
const { PrismaClient } = require("@prisma/client");

const requireAuth  = require("../middleware/auth");
const validate     = require("../middleware/validate");
const { DecisionSchema, BidderListQuerySchema } = require("../schemas/bidder.schema");
const { runAllConnectors }  = require("../connectors");
const { computeScore, deriveStatus } = require("../engines/scoring");
const { generateRecommendation }     = require("../engines/ollama");

const router = express.Router();
const prisma = new PrismaClient();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function notFound(res, id) {
  return res.status(404).json({ error: `Bidder '${id}' not found.` });
}

// ─── GET /api/bidders ────────────────────────────────────────────────────────

router.get("/", validate(BidderListQuerySchema, "query"), async (req, res, next) => {
  try {
    const { status, risk, q, page, pageSize } = req.query;

    const where = {
      ...(status ? { status } : {}),
      ...(risk   ? { risk }   : {}),
      ...(q
        ? {
            OR: [
              { name:       { contains: q, mode: "insensitive" } },
              { gstin:      { contains: q, mode: "insensitive" } },
              { pan:        { contains: q, mode: "insensitive" } },
              { tenderName: { contains: q, mode: "insensitive" } },
              { tenderId:   { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [total, bidders] = await Promise.all([
      prisma.bidder.count({ where }),
      prisma.bidder.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip:    (page - 1) * pageSize,
        take:    pageSize,
        select: {
          id:             true,
          name:           true,
          gstin:          true,
          pan:            true,
          udyam:          true,
          tenderId:       true,
          tenderName:     true,
          score:          true,
          risk:           true,
          status:         true,
          hardGated:      true,
          recommendation: true,
          createdAt:      true,
          updatedAt:      true,
          _count: { select: { checks: true, documents: true } },
        },
      }),
    ]);

    res.json({ bidders, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/bidders/:id ────────────────────────────────────────────────────

router.get("/:id", async (req, res, next) => {
  try {
    const bidder = await prisma.bidder.findUnique({
      where:   { id: req.params.id },
      include: {
        checks:    { orderBy: { createdAt: "asc"  } },
        documents: true,
        auditLogs: {
          orderBy: { timestamp: "desc" },
          include: { officer: { select: { id: true, name: true, email: true } } },
        },
      },
    });

    if (!bidder) return notFound(res, req.params.id);
    res.json(bidder);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/bidders/:id/verify ───────────────────────────────────────────

router.post("/:id/verify", requireAuth, async (req, res, next) => {
  try {
    const bidder = await prisma.bidder.findUnique({
      where:   { id: req.params.id },
      include: { checks: true },
    });
    if (!bidder) return notFound(res, req.params.id);

    console.log(`[Verify] Running connectors for ${bidder.name} …`);

    // 1. Run all 10 connectors in parallel
    const connectorResults = await runAllConnectors(bidder);

    // 2. Update each check in the DB
    const updatedChecks = await Promise.all(
      bidder.checks.map(async (check) => {
        const result = connectorResults.get(check.label);
        if (!result) return check; // connector not found — leave unchanged

        return prisma.check.update({
          where: { id: check.id },
          data:  { state: result.state, note: result.note },
        });
      })
    );

    // 3. Compute new score
    const { score, risk, hardGated } = computeScore(updatedChecks);
    const newStatus = deriveStatus(score, hardGated, bidder.status);

    // 4. Update bidder
    const updatedBidder = await prisma.bidder.update({
      where: { id: bidder.id },
      data:  { score, risk, hardGated, status: newStatus },
    });

    // 5. Write audit log
    await prisma.auditLog.create({
      data: {
        bidderId:  bidder.id,
        officerId: req.officer.id,
        actor:     req.officer.email,
        action:    `Manual verification run triggered. Score updated: ${bidder.score} → ${score}. Risk: ${risk}. Hard gate: ${hardGated}.`,
      },
    });

    console.log(`[Verify] Done — ${bidder.name}: score=${score}, risk=${risk}, hardGated=${hardGated}`);

    res.json({
      message:  "Verification complete.",
      score,
      risk,
      hardGated,
      status:   newStatus,
      checks:   updatedChecks,
    });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/bidders/:id/decision ────────────────────────────────────────

router.patch("/:id/decision", requireAuth, validate(DecisionSchema), async (req, res, next) => {
  try {
    const { action, note } = req.body;

    const bidder = await prisma.bidder.findUnique({ where: { id: req.params.id } });
    if (!bidder) return notFound(res, req.params.id);

    // Map action → status
    const statusMap = { approve: "approved", reject: "rejected", flag: "under_review" };
    const newStatus = statusMap[action];

    // Update recommendation text if a note was provided alongside a decision
    const dataUpdate = {
      status: newStatus,
      ...(note && action === "approve" ? { recommendation: note } : {}),
    };

    const updated = await prisma.bidder.update({
      where: { id: bidder.id },
      data:  dataUpdate,
    });

    // Audit log with real officer FK
    const actionDesc = {
      approve: `Officer decision: APPROVE. ${note ? `Note: ${note}` : "Forwarded to procurement committee."}`,
      reject:  `Officer decision: REJECT. ${note ? `Reason: ${note}` : "Bid rejected."}`,
      flag:    `Officer flagged bid for further review. ${note ? `Note: ${note}` : ""}`,
    }[action];

    await prisma.auditLog.create({
      data: {
        bidderId:  bidder.id,
        officerId: req.officer.id,
        actor:     req.officer.email,
        action:    actionDesc,
      },
    });

    res.json({
      message:  `Bid ${action}d successfully.`,
      id:       updated.id,
      status:   updated.status,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/bidders/:id/recommend ────────────────────────────────────────

router.post("/:id/recommend", requireAuth, async (req, res, next) => {
  try {
    const bidder = await prisma.bidder.findUnique({
      where:   { id: req.params.id },
      include: { checks: { orderBy: { createdAt: "asc" } } },
    });
    if (!bidder) return notFound(res, req.params.id);

    console.log(`[Ollama] Generating recommendation for ${bidder.name} …`);
    const recommendation = await generateRecommendation(bidder, bidder.checks);

    // Persist to DB
    const updated = await prisma.bidder.update({
      where: { id: bidder.id },
      data:  { recommendation },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        bidderId:  bidder.id,
        officerId: req.officer.id,
        actor:     req.officer.email,
        action:    "AI recommendation generated and stored.",
      },
    });

    res.json({ recommendation, updatedAt: updated.updatedAt });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
