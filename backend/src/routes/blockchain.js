const express = require("express");
const requireAuth = require("../middleware/auth");
const { PrismaClient } = require("@prisma/client");
const { recordVerificationOnChain, verifyIntegrity } = require("../services/blockchain");

const router = express.Router();
const prisma = new PrismaClient();

// ─── POST /api/blockchain/record/:id ──────────────────────────────────────────
// Registers a finalized verification on the blockchain
router.post("/record/:id", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if already registered
    const bidder = await prisma.bidder.findUnique({ where: { id } });
    if (!bidder) return res.status(404).json({ error: "Bidder not found" });
    if (bidder.blockchainTxId) {
      return res.status(400).json({ error: "Verification is already registered on the blockchain" });
    }

    const result = await recordVerificationOnChain(id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/blockchain/verify/:id ───────────────────────────────────────────
// Verifies the integrity of a verification record
router.get("/verify/:id", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const bidder = await prisma.bidder.findUnique({ where: { id } });
    if (!bidder) return res.status(404).json({ error: "Bidder not found" });
    
    const result = await verifyIntegrity(id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/blockchain/tamper/:id (DEMO ONLY) ─────────────────────────────
// Artificially modifies the DB record to break the hash and demonstrate tamper detection
router.post("/tamper/:id", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const bidder = await prisma.bidder.findUnique({ where: { id } });
    if (!bidder) return res.status(404).json({ error: "Bidder not found" });

    // Deduct 15 points to simulate malicious tampering
    const newScore = Math.max(0, (bidder.score || 100) - 15);
    const newRisk = newScore < 50 ? "high" : newScore < 80 ? "medium" : "low";

    await prisma.bidder.update({
      where: { id },
      data: { score: newScore, risk: newRisk }
    });

    await prisma.auditLog.create({
      data: {
        bidderId: id,
        actor: "Demo Hacker",
        action: `TAMPER TEST: Maliciously changed score from ${bidder.score} to ${newScore}`
      }
    });

    res.json({ message: "Record maliciously modified. Please run Integrity Verification." });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
