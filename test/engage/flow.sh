#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

PROJECT_ID="${PROJECT_ID:-1}"
FLOW_UUID="${FLOW_UUID:-flow_uuid_123}"
FLOW_ID="${FLOW_ID:-flow_id_123}"
NODE_UUID="${NODE_UUID:-node_uuid_123}"
CLUSTER_DEF="${CLUSTER_DEF:-{\"indicatorName\":\"entry\",\"dataViewType\":\"2\",\"isSummary\":true,\"filterStartDate\":\"2026-04-01\",\"filterEndDate\":\"2026-04-07\"}}"

echo "[dry-run] flow list"
node dist/index.js --dry-run engage-flow flow list --project-id "$PROJECT_ID"

echo "[dry-run] flow detail"
node dist/index.js --dry-run engage-flow flow get --project-id "$PROJECT_ID" --flow-uuid "$FLOW_UUID"

echo "[dry-run] flow node config schema"
node dist/index.js --dry-run engage-flow node-config schema --project-id 1 --node-type message_push

echo "[dry-run] flow process report"
node dist/index.js capability dry-run engage-flow.report.process --input "{\"project_id\":$PROJECT_ID,\"flow_uuid\":\"$FLOW_UUID\",\"report_type\":\"overview\"}"

echo "[dry-run] flow metric detail report"
node dist/index.js --dry-run engage-flow report metric-detail run --project-id "$PROJECT_ID" --flow-id "$FLOW_ID" --node-uuid "$NODE_UUID" --start-time 2026-04-01 --end-time 2026-04-07 --timeout-seconds 120

echo "[dry-run] flow metric detail export"
node dist/index.js --dry-run engage-flow report metric-detail export --project-id "$PROJECT_ID" --flow-id "$FLOW_ID" --node-uuid "$NODE_UUID" --start-time 2026-04-01 --end-time 2026-04-07 --artifact-format csv --timeout-seconds 21600

echo "[dry-run] flow metric update"
node dist/index.js --dry-run engage-flow metric update --project-id "$PROJECT_ID" --flow-id "$FLOW_ID" --metric-map '{"ACTION":[{"metricSettingId":"metric_1","displayName":"Pay users","orderId":1}]}'

echo "[dry-run] flow metric user"
node dist/index.js --dry-run engage-flow metric-user run --project-id "$PROJECT_ID" --flow-id "$FLOW_ID" --cluster-def "$CLUSTER_DEF" --limit 100 --timeout-seconds 120

echo "[dry-run] flow metric user export"
node dist/index.js --dry-run engage-flow metric-user export --project-id "$PROJECT_ID" --flow-id "$FLOW_ID" --cluster-def "$CLUSTER_DEF" --artifact-format csv --timeout-seconds 21600

echo "[dry-run] flow node user"
node dist/index.js --dry-run engage-flow node-user run --project-id "$PROJECT_ID" --flow-id "$FLOW_ID" --node-uuid "$NODE_UUID" --cluster-def "$CLUSTER_DEF" --limit 100 --timeout-seconds 120

echo "[dry-run] flow node user export"
node dist/index.js --dry-run engage-flow node-user export --project-id "$PROJECT_ID" --flow-id "$FLOW_ID" --node-uuid "$NODE_UUID" --cluster-def "$CLUSTER_DEF" --artifact-format csv --timeout-seconds 21600

echo "[dry-run] flow node metric user"
node dist/index.js --dry-run engage-flow node-metric-user run --project-id "$PROJECT_ID" --flow-id "$FLOW_ID" --node-uuid "$NODE_UUID" --cluster-def "$CLUSTER_DEF" --limit 100 --timeout-seconds 120

echo "[dry-run] flow node metric user export"
node dist/index.js --dry-run engage-flow node-metric-user export --project-id "$PROJECT_ID" --flow-id "$FLOW_ID" --node-uuid "$NODE_UUID" --cluster-def "$CLUSTER_DEF" --artifact-format csv --timeout-seconds 21600

echo "[dry-run] save flow"
node dist/index.js --dry-run engage-flow flow save --project-id "$PROJECT_ID" --req '{"operation":"build","flowName":"demo flow","flowDesc":"demo","nodes":[{"id":"node_1","name":"entry","type":"single_trigger","config":{"targetUserType":2,"triggerTime":"2026-03-31 19:00","flowEndDate":"2026-04-04 18:00","targetClusterName":"cohort_20260331_182643"}},{"id":"node_2","name":"exit","type":"exit_flow","config":{}}],"edges":[{"source":"node_1","target":"node_2"}]}'

echo "[dry-run] manage flow"
node dist/index.js --dry-run engage-flow flow manage --project-id "$PROJECT_ID" --action end --flow-id-list '["flow_id_1"]'

# Real call examples:
# node dist/index.js engage-flow flow list --project-id "$PROJECT_ID"
# node dist/index.js engage-flow flow get --project-id "$PROJECT_ID" --flow-uuid "$FLOW_UUID"
