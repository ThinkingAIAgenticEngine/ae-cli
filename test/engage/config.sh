#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

PROJECT_ID="${PROJECT_ID:-1}"
CONFIG_ID="${CONFIG_ID:-config_123}"

echo "[dry-run] config item list"
node dist/index.js --dry-run te-engage +config-item-list --project-id "$PROJECT_ID"

echo "[dry-run] config item detail"
node dist/index.js --dry-run te-engage +config-item-detail --project-id "$PROJECT_ID" --config-id "$CONFIG_ID"

echo "[dry-run] strategy list"
node dist/index.js --dry-run te-engage +strategy-list --project-id "$PROJECT_ID" --config-id "$CONFIG_ID"

echo "[dry-run] config item trigger report"
node dist/index.js --dry-run te-engage +config-item-trigger-report --project-id "$PROJECT_ID" --config-id "$CONFIG_ID" --start-time 2026-04-01 --end-time 2026-04-07

echo "[dry-run] manage strategy"
node dist/index.js --dry-run te-engage +manage-strategy --project-id "$PROJECT_ID" --config-id "$CONFIG_ID" --action online --strategy-uuid-list '["uuid_1"]'

# Real call examples:
# node dist/index.js te-engage +config-item-list --project-id "$PROJECT_ID"
# node dist/index.js te-engage +strategy-list --project-id "$PROJECT_ID" --config-id "$CONFIG_ID"
