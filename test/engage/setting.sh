#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

PROJECT_ID="${PROJECT_ID:-1}"
CHANNEL_ID="${CHANNEL_ID:-channel_123}"
REQUEST_ID="${REQUEST_ID:-00000000-0000-0000-0000-000000000000}"
MCP_URL="${MCP_URL:-http://example.com/custom}"

echo "[dry-run] channel list"
node dist/index.js --dry-run te-engage +channel-list --project-id "$PROJECT_ID"

echo "[dry-run] channel list with provider filter"
node dist/index.js --dry-run te-engage +channel-list --project-id "$PROJECT_ID" --provider-list '["webhook","fcm"]'

echo "[dry-run] channel list with channel-status 0"
node dist/index.js --dry-run te-engage +channel-list --project-id "$PROJECT_ID" --channel-status 0

echo "[dry-run] channel list with mcp-url override"
node dist/index.js --dry-run --mcp-url "$MCP_URL" te-engage +channel-list --project-id "$PROJECT_ID"

echo "[dry-run] channel detail"
node dist/index.js --dry-run te-engage +channel-detail --project-id "$PROJECT_ID" --channel-id "$CHANNEL_ID"

echo "[dry-run] config channel list"
node dist/index.js --dry-run te-engage +config-channel-list --project-id "$PROJECT_ID"

echo "[dry-run] add approver"
node dist/index.js --dry-run te-engage +add-approver --project-id "$PROJECT_ID" --approvers '["ou_xxx","ou_yyy"]'

echo "[dry-run] add channel"
node dist/index.js --dry-run te-engage +add-channel --project-id "$PROJECT_ID" --req '{"channelType":1,"channelSubBizType":"webhook","channelName":"demo","pushIdType":"user_id","config":"{}","enableTouchEvent":0,"eventClickName":"","eventDeliveryName":"","touchEventSource":""}'

echo "[dry-run] cancel query by request id"
node dist/index.js --dry-run te-engage +cancel-query-by-request-id --request-id "$REQUEST_ID"

# Real call examples:
# node dist/index.js te-engage +channel-list --project-id "$PROJECT_ID"
# node dist/index.js te-engage +config-channel-list --project-id "$PROJECT_ID"
# node dist/index.js te-engage +channel-detail --project-id "$PROJECT_ID" --channel-id "$CHANNEL_ID"
