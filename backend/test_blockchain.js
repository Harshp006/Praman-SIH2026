const { generateCanonicalPayload, generateHash } = require('./src/services/blockchain');

console.log("=== Testing Blockchain Hash Generation ===");

const bidder = {
  id: "VER-100",
  tenderId: "TEND-01",
  gstin: "22ABCDE1234F1Z5",
  score: 85,
  risk: "low"
};

const checks = [
  { id: "B", label: "Check 2", state: "pass", weight: 20 },
  { id: "A", label: "Check 1", state: "fail", weight: 10 }
];

const payload1 = generateCanonicalPayload(bidder, checks);
const hash1 = generateHash(payload1);

console.log("Payload 1:", payload1);
console.log("Hash 1:", hash1);

// Test consistency
const payload2 = generateCanonicalPayload(bidder, [checks[1], checks[0]]); // reverse order
const hash2 = generateHash(payload2);
console.log("Hash 2 (reordered checks):", hash2);

if (hash1 === hash2) {
  console.log("SUCCESS: Hashes match regardless of check order.");
} else {
  console.error("FAIL: Hashes mismatch!");
}

// Test tampering
const tamperedBidder = { ...bidder, score: 70 };
const payload3 = generateCanonicalPayload(tamperedBidder, checks);
const hash3 = generateHash(payload3);
console.log("Hash 3 (tampered score):", hash3);

if (hash1 !== hash3) {
  console.log("SUCCESS: Tampering detected (hash changed).");
} else {
  console.error("FAIL: Hash did not change!");
}
