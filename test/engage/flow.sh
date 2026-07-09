#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

PROJECT_ID="${PROJECT_ID:-1}"
FLOW_UUID="${FLOW_UUID:-flow_uuid_123}"

echo "[dry-run] flow list"
node dist/index.js --dry-run engage +flow_list --project_id "$PROJECT_ID"

echo "[dry-run] flow detail"
node dist/index.js --dry-run engage +flow_detail --project_id "$PROJECT_ID" --flow_uuid "$FLOW_UUID"

echo "[dry-run] flow node config schema"
node dist/index.js --dry-run engage +flow_node_config_schema --node_type message_push

echo "[dry-run] flow process report"
node dist/index.js --dry-run engage +flow_process_report --project_id "$PROJECT_ID" --flow_uuid "$FLOW_UUID" --report_type overview

echo "[dry-run] save flow"
node dist/index.js --dry-run engage +save_flow --project_id "$PROJECT_ID" --req '{"operation":"build","flowName":"demo flow","flowDesc":"demo","nodes":[{"id":"node_1","name":"entry","type":"single_trigger","config":{"targetUserType":2,"triggerTime":"2026-03-31 19:00","flowEndDate":"2026-04-04 18:00","targetClusterName":"cohort_20260331_182643"}},{"id":"node_2","name":"exit","type":"exit_flow","config":{}}],"edges":[{"source":"node_1","target":"node_2"}]}'

echo "[dry-run] manage flow"
node dist/index.js --dry-run engage +manage_flow --project_id "$PROJECT_ID" --action end --flow_id_list '["flow_id_1"]'

# Real call examples:
# node dist/index.js engage +flow_list --project_id "$PROJECT_ID"
# node dist/index.js engage +flow_detail --project_id "$PROJECT_ID" --flow_uuid "$FLOW_UUID"
