#!/usr/bin/env bash
# Build and deploy the Beam Anchor program.
# Usage (from packages/anchor): ./scripts/deploy.sh [localnet|devnet]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANCHOR_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$ANCHOR_ROOT/../.." && pwd)"

CLUSTER="${1:-devnet}"
PROGRAM_ID="EV5iVxtuerZqQiqBFytRxZtdtWmDiqBengp47izzLEBn"

case "$CLUSTER" in
  localnet|localhost)
    RPC="http://localhost:8899"
    WALLET="~/.config/solana/id.json"
    ;;
  devnet)
    RPC="https://api.devnet.solana.com"
    WALLET="~/.config/solana/devnet-wallet.json"
    ;;
  *)
    echo "Unknown cluster: $CLUSTER (use localnet or devnet)"
    exit 1
    ;;
esac

echo "=== Beam Finance — Deploy ==="
echo "  Cluster:    $CLUSTER"
echo "  RPC:        $RPC"
echo "  Program ID: $PROGRAM_ID"
echo ""

cd "$ANCHOR_ROOT"

echo "[1/3] Building program..."
anchor build

echo ""
echo "[2/3] Deploying to $CLUSTER..."
anchor deploy \
  --provider.cluster "$RPC" \
  --provider.wallet "$WALLET" \
  --program-name beam

echo ""
echo "[3/3] Copying IDL to frontend..."
cp target/idl/beam.json "$REPO_ROOT/apps/web/src/lib/idl.json" 2>/dev/null || echo "  (IDL copy skipped — file may not exist yet)"

echo ""
echo "Deploy complete!"
echo "  Explorer: https://explorer.solana.com/address/$PROGRAM_ID?cluster=$CLUSTER"
