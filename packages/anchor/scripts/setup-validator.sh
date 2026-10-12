#!/usr/bin/env bash
# Start a local Solana test validator with the Beam program pre-loaded.
# Usage (from packages/anchor): ./scripts/setup-validator.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANCHOR_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

PROGRAM_ID="EV5iVxtuerZqQiqBFytRxZtdtWmDiqBengp47izzLEBn"
PROGRAM_SO="$ANCHOR_ROOT/target/deploy/beam.so"

if [ ! -f "$PROGRAM_SO" ]; then
  echo "Program binary not found. Building..."
  (cd "$ANCHOR_ROOT" && anchor build)
fi

echo "Starting local validator with Beam program..."
echo "  Program ID: $PROGRAM_ID"
echo "  RPC:        http://localhost:8899"
echo ""

solana-test-validator \
  --bpf-program "$PROGRAM_ID" "$PROGRAM_SO" \
  --reset \
  --quiet &

VALIDATOR_PID=$!

sleep 3

if kill -0 "$VALIDATOR_PID" 2>/dev/null; then
  echo "Validator running (PID: $VALIDATOR_PID)"
  echo ""
  echo "Airdropping 100 SOL to default wallet..."
  solana airdrop 100 --url http://localhost:8899 2>/dev/null || true
  echo ""
  echo "Ready! Run 'solana logs --url localhost' in another terminal to watch."
  echo "Press Ctrl+C to stop."
  wait "$VALIDATOR_PID"
else
  echo "Failed to start validator."
  exit 1
fi
