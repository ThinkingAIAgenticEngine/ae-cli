#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

PROJECT_ID="${PROJECT_ID:-1}"
CHANNEL_ID="${CHANNEL_ID:-channel_123}"
REQUEST_ID="${REQUEST_ID:-00000000-0000-0000-0000-000000000000}"
MCP_URL="${MCP_URL:-http://example.com/custom}"

echo "[dry-run] channel list"
node dist/index.js --dry-run engage +channel_list --project_id "$PROJECT_ID"

echo "[dry-run] channel list with provider filter"
node dist/index.js --dry-run engage +channel_list --project_id "$PROJECT_ID" --provider_list '["webhook","fcm"]'

echo "[dry-run] channel list with channel-status 0"
node dist/index.js --dry-run engage +channel_list --project_id "$PROJECT_ID" --channel_status 0

echo "[dry-run] channel list with mcp-url override"
node dist/index.js --dry-run --mcp_url "$MCP_URL" engage +channel_list --project_id "$PROJECT_ID"

echo "[dry-run] channel detail"
node dist/index.js --dry-run engage +channel_detail --project_id "$PROJECT_ID" --channel_id "$CHANNEL_ID"

echo "[dry-run] config channel list"
node dist/index.js --dry-run engage +config_channel_list --project_id "$PROJECT_ID"

echo "[dry-run] add approver"
node dist/index.js --dry-run engage +add_approver --project_id "$PROJECT_ID" --approvers '["ou_xxx","ou_yyy"]'

echo "[dry-run] add channel"
node dist/index.js --dry-run engage +add_channel --project_id "$PROJECT_ID" --req '{"channelType":1,"channelSubBizType":"webhook","channelName":"demo","pushIdType":"user_id","config":"{}","enableTouchEvent":0,"eventClickName":"","eventDeliveryName":"","touchEventSource":""}'
