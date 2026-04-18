#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

PROJECT_ID="${PROJECT_ID:-1}"
FLOW_UUID="${FLOW_UUID:-flow_uuid_123}"

echo "[dry-run] flow list"
node dist/index.js --dry-run te-engage +flow-list --project-id "$PROJECT_ID"

echo "[dry-run] flow detail"
node dist/index.js --dry-run te-engage +flow-detail --project-id "$PROJECT_ID" --flow-uuid "$FLOW_UUID"

echo "[dry-run] flow node config schema"
node dist/index.js --dry-run te-engage +flow-node-config-schema --node-type message_push

echo "[dry-run] flow process report"
node dist/index.js --dry-run te-engage +flow-process-report --project-id "$PROJECT_ID" --flow-uuid "$FLOW_UUID" --report-type overview

echo "[dry-run] save flow"
node dist/index.js --dry-run te-engage +save-flow --project-id "$PROJECT_ID" --req '{"flowName":"demo flow","flowDesc":"demo","nodeList":[{"id":"node_1","name":"entry","type":"single_trigger","config":"{}"},{"id":"node_2","name":"exit","type":"exit_flow","config":"{}"}],"edgeList":[{"source":"node_1","target":"node_2"}]}'

echo "[dry-run] manage flow"
node dist/index.js --dry-run te-engage +manage-flow --project-id "$PROJECT_ID" --action end --flow-id-list '["flow_id_1"]'

# Real call examples:
# node dist/index.js te-engage +flow-list --project-id "$PROJECT_ID"
# node dist/index.js te-engage +flow-detail --project-id "$PROJECT_ID" --flow-uuid "$FLOW_UUID"
