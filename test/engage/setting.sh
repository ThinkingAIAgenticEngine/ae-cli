#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

PROJECT_ID="${PROJECT_ID:-1}"
CHANNEL_ID="${CHANNEL_ID:-channel_123}"
REQUEST_ID="${REQUEST_ID:-00000000-0000-0000-0000-000000000000}"

echo "[dry-run] channel list"
node dist/index.js --dry-run engage-setting channel list --project-id "$PROJECT_ID"

echo "[dry-run] channel list with provider filter"
node dist/index.js --dry-run engage-setting channel list --project-id "$PROJECT_ID" --provider-list '["webhook","fcm"]'

echo "[dry-run] channel list with channel-status 0"
node dist/index.js --dry-run engage-setting channel list --project-id "$PROJECT_ID" --channel-status 0

echo "[dry-run] channel detail"
node dist/index.js --dry-run engage-setting channel get --project-id "$PROJECT_ID" --channel-id "$CHANNEL_ID"

echo "[dry-run] config channel list"
node dist/index.js --dry-run engage-scene config-channel list --project-id "$PROJECT_ID"

echo "[dry-run] add approver"
node dist/index.js --dry-run engage-setting approval-approver add --project-id "$PROJECT_ID" --approvers '["ou_xxx","ou_yyy"]'

echo "[dry-run] add channel"
node dist/index.js --dry-run engage-setting channel create --project-id "$PROJECT_ID" --req '{"channelType":1,"channelSubBizType":"webhook","channelName":"demo","pushIdType":"user_id","config":"{}","enableTouchEvent":0,"eventClickName":"","eventDeliveryName":"","touchEventSource":""}'

echo "[dry-run] cancel report query"
node dist/index.js capability dry-run engage-setting.query.cancel --input "{\"request_id\":\"$REQUEST_ID\"}"
