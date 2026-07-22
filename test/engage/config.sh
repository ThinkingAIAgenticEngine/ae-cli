#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

PROJECT_ID="${PROJECT_ID:-1}"
CONFIG_ID="${CONFIG_ID:-config_123}"

echo "[dry-run] config item list"
node dist/index.js --dry-run engage-scene config-item list --project-id "$PROJECT_ID"

echo "[dry-run] config item detail"
node dist/index.js --dry-run engage-scene config-item get --project-id "$PROJECT_ID" --config-id "$CONFIG_ID"

echo "[dry-run] strategy list"
node dist/index.js --dry-run engage-scene strategy list --project-id "$PROJECT_ID" --config-id "$CONFIG_ID"

echo "[dry-run] config item trigger report"
node dist/index.js capability dry-run engage-scene.report.config-item-trigger \
  --input "{\"project_id\":$PROJECT_ID,\"config_id\":\"$CONFIG_ID\",\"start_time\":\"2026-04-01\",\"end_time\":\"2026-04-07\"}"

echo "[dry-run] manage strategy"
node dist/index.js --dry-run engage-scene strategy manage --project-id "$PROJECT_ID" --config-id "$CONFIG_ID" \
  --action online --strategy-uuid-list '["uuid_1"]'
