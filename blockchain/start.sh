#!/bin/bash
echo "Starting Blockchain API Gateway (and optional Fabric Network)..."
echo "Note: Full Hyperledger Fabric setup requires extensive crypto-materials."
echo "For this hackathon prototype, the Go API Gateway is designed to automatically"
echo "fallback to a simulated append-only ledger if the Fabric containers are not running."

docker-compose -f docker-compose.blockchain.yml up -d blockchain-api

echo "Blockchain API is running on http://localhost:5000"
