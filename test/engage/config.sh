#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

PROJECT_ID="${PROJECT_ID:-1}"
CONFIG_ID="${CONFIG_ID:-config_123}"

echo "[dry-run] config item list"
node dist/index.js --dry-run engage +config_item_list --project_id "$PROJECT_ID"

echo "[dry-run] config item detail"
node dist/index.js --dry-run engage +config_item_detail --project_id "$PROJECT_ID" --config_id "$CONFIG_ID"

echo "[dry-run] strategy list"
node dist/index.js --dry-run engage +strategy_list --project_id "$PROJECT_ID" --config_id "$CONFIG_ID"

echo "[dry-run] config item trigger report"
node dist/index.js --dry-run engage +config_item_trigger_report --project_id "$PROJECT_ID" --config_id "$CONFIG_ID" --start_time 2026-04-01 --end_time 2026-04-07

echo "[dry-run] manage strategy"
node dist/index.js --dry-run engage +manage_strategy --project_id "$PROJECT_ID" --config_id "$CONFIG_ID" --action online --strategy_uuid_list '["uuid_1"]'
