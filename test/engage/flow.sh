#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

PROJECT_ID="${PROJECT_ID:-1}"
FLOW_UUID="${FLOW_UUID:-flow_uuid_123}"

echo "[dry-run] flow list"
node dist/index.js --dry-run engage-flow flow list --project-id "$PROJECT_ID"

echo "[dry-run] flow detail"
node dist/index.js --dry-run engage-flow flow get --project-id "$PROJECT_ID" --flow-uuid "$FLOW_UUID"

echo "[dry-run] flow node config schema"
node dist/index.js --dry-run engage-flow node-config schema --project-id 1 --node-type message_push

echo "[dry-run] flow process report"
node dist/index.js capability dry-run engage-flow.report.process --input "{\"project_id\":$PROJECT_ID,\"flow_uuid\":\"$FLOW_UUID\",\"report_type\":\"overview\"}"

echo "[dry-run] save flow"
node dist/index.js --dry-run engage-flow flow save --project-id "$PROJECT_ID" --req '{"operation":"build","flowName":"demo flow","flowDesc":"demo","nodes":[{"id":"node_1","name":"entry","type":"single_trigger","config":{"targetUserType":2,"triggerTime":"2026-03-31 19:00","flowEndDate":"2026-04-04 18:00","targetClusterName":"cohort_20260331_182643"}},{"id":"node_2","name":"exit","type":"exit_flow","config":{}}],"edges":[{"source":"node_1","target":"node_2"}]}'

echo "[dry-run] manage flow"
node dist/index.js --dry-run engage-flow flow manage --project-id "$PROJECT_ID" --action end --flow-id-list '["flow_id_1"]'

# Real call examples:
# node dist/index.js engage-flow flow list --project-id "$PROJECT_ID"
# node dist/index.js engage-flow flow get --project-id "$PROJECT_ID" --flow-uuid "$FLOW_UUID"
