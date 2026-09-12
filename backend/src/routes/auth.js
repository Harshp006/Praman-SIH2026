/**
 * auth.js (routes) — Authentication routes
 * POST /api/auth/login
 */

"use strict";

const express  = require("express");
const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");

const config   = require("../config");
const validate  = require("../middleware/validate");
const { LoginSchema } = require("../schemas/auth.schema");

const router = express.Router();
const prisma = new PrismaClient();

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Returns: { token, officer: { id, email, name } }
 */
router.post("/login", validate(LoginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    console.log(`[AUTH] Incoming login request for email: "${email}"`);

    const officer = await prisma.officer.findUnique({ where: { email } });
    if (!officer) {
      console.log(`[AUTH] User lookup result: Officer NOT found for email: "${email}"`);
      // Constant-time response — don't leak whether the email exists
      await bcrypt.hash("dummy", 10);
      return res.status(401).json({ error: "Invalid email or password." });
    }

    console.log(`[AUTH] User lookup result: Found officer ID "${officer.id}" (${officer.name})`);

    const match = await bcrypt.compare(password, officer.passwordHash);
    if (!match) {
      console.log(`[AUTH] Password verification failed for email: "${email}"`);
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const payload = { id: officer.id, email: officer.email, name: officer.name };
    const token   = jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN,
    });

    console.log(`[AUTH] Successful login for officer: "${officer.email}" (${officer.name})`);

    return res.json({
      token,
      officer: { id: officer.id, email: officer.email, name: officer.name },
    });
  } catch (err) {
    console.error(`[AUTH ERROR] Database or authentication error during login for "${req.body?.email}":`, err.message);
    next(err);
  }
});

/**
 * GET /api/auth/me — Validate token + return officer identity
 * (Useful for Layer 3 to re-hydrate session on page reload)
 */
const requireAuth = require("../middleware/auth");

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const officer = await prisma.officer.findUnique({
      where:  { id: req.officer.id },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    if (!officer) return res.status(404).json({ error: "Officer not found." });
    res.json({ officer });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
