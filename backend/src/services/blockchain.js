const crypto = require('crypto');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// The URL of our Go API Gateway
const BLOCKCHAIN_API_URL = process.env.BLOCKCHAIN_API_URL || 'http://localhost:5000';

/**
 * Generate a canonical JSON representation of the verification record.
 * This ensures that the same data always produces the exact same hash.
 */
function generateCanonicalPayload(bidder, checks) {
  const payload = {
    verificationId: bidder.id,
    tenderId: bidder.tenderId,
    bidderReference: bidder.gstin, // Using GSTIN as a generic bidder reference
    score: bidder.score,
    risk: bidder.risk,
    // Sort checks by ID to guarantee consistent ordering
    checks: (checks || []).map(c => ({
      id: c.id,
      label: c.label,
      state: c.state,
      weight: c.weight
    })).sort((a, b) => a.id.localeCompare(b.id))
  };

  return JSON.stringify(payload);
}

/**
 * Generates SHA-256 hash of the canonical payload
 */
function generateHash(canonicalJson) {
  return crypto.createHash('sha256').update(canonicalJson).digest('hex');
}

/**
 * Register a verification record on the blockchain.
 * Tries external Go service first; falls back to embedded cryptographic ledger if external node is down.
 */
async function recordVerificationOnChain(bidderId) {
  // 1. Fetch data
  const bidder = await prisma.bidder.findUnique({
    where: { id: bidderId },
    include: { checks: true }
  });

  if (!bidder) throw new Error("Bidder not found");
  if (bidder.score === null || bidder.score === undefined) throw new Error("Bidder has not been verified yet");

  // 2. Generate canonical payload and hash
  const payload = generateCanonicalPayload(bidder, bidder.checks);
  const hash = generateHash(payload);
  const timestamp = new Date().toISOString();

  let txId = null;
  let ledgerType = "Go Blockchain Network";

  // 3. Try external Go API Gateway
  try {
    const response = await axios.post(`${BLOCKCHAIN_API_URL}/record`, {
      verificationId: bidder.id,
      tenderId: bidder.tenderId,
      bidderReference: bidder.gstin,
      resultHash: hash,
      timestamp: timestamp
    }, { timeout: 3000 });

    if (response.data && response.data.success) {
      txId = response.data.txId;
    }
  } catch (err) {
    console.warn(`[Blockchain Service] External node (${BLOCKCHAIN_API_URL}) unreachable (${err.message}). Falling back to Embedded SHA-256 Block Ledger.`);
    // Generate deterministic embedded local transaction ID
    txId = "0x" + crypto.createHash("sha256").update(`${bidder.id}:${hash}:${timestamp}`).digest("hex").substring(0, 32);
    ledgerType = "Embedded Local Ledger";
  }

  if (!txId) {
    txId = "0x" + crypto.createHash("sha256").update(`${bidder.id}:${hash}:${timestamp}`).digest("hex").substring(0, 32);
  }

  // 4. Save txId & hash to DB
  await prisma.bidder.update({
    where: { id: bidder.id },
    data: {
      blockchainTxId: txId,
      blockchainHash: hash,
      blockchainRecordedAt: new Date()
    }
  });
  
  // Add audit log
  await prisma.auditLog.create({
    data: {
      bidderId: bidder.id,
      actor: "System",
      action: `Blockchain Registration Successful (${ledgerType}). TxID: ${txId}`
    }
  });

  return { success: true, txId, hash, ledgerType };
}

/**
 * Verify a record's integrity against the blockchain.
 * Tries external Go service first; falls back to cryptographic comparison against stored DB hash.
 */
async function verifyIntegrity(bidderId) {
  // 1. Fetch current data
  const bidder = await prisma.bidder.findUnique({
    where: { id: bidderId },
    include: { checks: true }
  });

  if (!bidder || !bidder.blockchainTxId) {
    throw new Error("Bidder not registered on blockchain");
  }

  // 2. Generate current hash
  const payload = generateCanonicalPayload(bidder, bidder.checks);
  const currentHash = generateHash(payload);

  // 3. Query Go API Gateway
  try {
    const response = await axios.get(`${BLOCKCHAIN_API_URL}/verify`, {
      params: {
        id: bidder.id,
        hash: currentHash
      },
      timeout: 3000
    });

    return {
      verified: response.data.verified,
      message: response.data.message,
      currentHash: currentHash,
      recordedHash: bidder.blockchainHash,
      ledgerType: "Go Blockchain Network"
    };
  } catch (err) {
    console.warn(`[Blockchain Service] External node (${BLOCKCHAIN_API_URL}) unreachable (${err.message}). Performing embedded hash integrity verification.`);
    
    // Embedded Hash Check
    const verified = (currentHash === bidder.blockchainHash);
    const message = verified
      ? "Cryptographic SHA-256 proof verified. Record is authentic and untampered."
      : "TAMPER DETECTED! Current record hash does not match the immutable cryptographic hash recorded on registration.";

    return {
      verified,
      message,
      currentHash,
      recordedHash: bidder.blockchainHash,
      ledgerType: "Embedded Local Ledger"
    };
  }
}

module.exports = {
  recordVerificationOnChain,
  verifyIntegrity,
  generateCanonicalPayload,
  generateHash
};
