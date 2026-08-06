#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

PROJECT_ID="${PROJECT_ID:-1}"
TASK_ID="${TASK_ID:-task_123}"

echo "[dry-run] task list"
node dist/index.js --dry-run engage-task task list --project-id "$PROJECT_ID" --req '{"pageNum":1,"pageSize":20}'

echo "[dry-run] build task save guide (generic)"
node dist/index.js --dry-run engage-task task build-save-guide --project-id "$PROJECT_ID" --req '{}'

echo "[dry-run] build task save guide (context)"
node dist/index.js --dry-run engage-task task build-save-guide --project-id "$PROJECT_ID" --req '{"context":{"triggerType":2,"channelId":"channel_123"}}'

echo "[dry-run] build task save guide (draft)"
node dist/index.js --dry-run engage-task task build-save-guide --project-id "$PROJECT_ID" --req '{"draft":{"baseInfo":{"taskName":"Demo Task"}}}'

echo "[dry-run] save task"
node dist/index.js --dry-run engage-task task save --project-id "$PROJECT_ID" --req '{"baseInfo":{"taskName":"Demo Task"},"channelConfig":{"channelType":1,"channelId":"channel_123","groupContentList":[{"contentList":[{"pushLanguageCode":"default","content":"[]"}]}]},"targetConfig":{"targetClusterType":3},"triggerConfig":{"triggerType":2},"controlConfig":{"completionIndicatorDef":{"completionIndicators":[]}}}'

echo "[dry-run] task stats"
node dist/index.js --dry-run engage-task task stats --project-id "$PROJECT_ID" --req '{"pageNum":1,"pageSize":20}'

echo "[dry-run] task detail"
node dist/index.js --dry-run engage-task task get --project-id "$PROJECT_ID" --task-id "$TASK_ID"

echo "[dry-run] task data detail"
node dist/index.js --dry-run engage-task data-detail query --project-id "$PROJECT_ID" --task-id "$TASK_ID" --detail-type time --start-time 2026-04-01 --end-time 2026-04-07

echo "[dry-run] task metric detail"
node dist/index.js --dry-run engage-task effect query --project-id "$PROJECT_ID" --task-id "$TASK_ID" --start-time 2026-04-01 --end-time 2026-04-07 --metric-id-list '["metric_1"]'

echo "[dry-run] manage task"
node dist/index.js --dry-run engage-task task manage --project-id "$PROJECT_ID" --task-id "$TASK_ID" --action pause
