#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

PROJECT_ID="${PROJECT_ID:-1}"
TASK_ID="${TASK_ID:-task_123}"

echo "[dry-run] task list"
node dist/index.js --dry-run engage +task_list --project_id "$PROJECT_ID" --req '{"pageNum":1,"pageSize":20}'

echo "[dry-run] build task save guide (generic)"
node dist/index.js --dry-run engage +build_task_save_guide --project_id "$PROJECT_ID" --req '{}'

echo "[dry-run] build task save guide (context)"
node dist/index.js --dry-run engage +build_task_save_guide --project_id "$PROJECT_ID" --req '{"context":{"triggerType":2,"channelId":"channel_123"}}'

echo "[dry-run] build task save guide (draft)"
node dist/index.js --dry-run engage +build_task_save_guide --project_id "$PROJECT_ID" --req '{"draft":{"baseInfo":{"taskName":"Demo Task"}}}'

echo "[dry-run] save task"
node dist/index.js --dry-run engage +save_task --project_id "$PROJECT_ID" --req '{"baseInfo":{"taskName":"Demo Task"},"channelConfig":{"channelType":1,"channelId":"channel_123","groupContentList":[{"contentList":[{"pushLanguageCode":"default","content":"[]"}]}]},"targetConfig":{"targetClusterType":3},"triggerConfig":{"triggerType":2},"controlConfig":{"completionIndicatorDef":{"completionIndicators":[]}}}'

echo "[dry-run] task stats"
node dist/index.js --dry-run engage +task_stats --project_id "$PROJECT_ID" --req '{"pageNum":1,"pageSize":20}'

echo "[dry-run] task detail"
node dist/index.js --dry-run engage +task_detail --project_id "$PROJECT_ID" --task_id "$TASK_ID"

echo "[dry-run] task data detail"
node dist/index.js --dry-run engage +task_data_detail --project_id "$PROJECT_ID" --task_id "$TASK_ID" --detail_type time --start_time 2026-04-01 --end_time 2026-04-07

echo "[dry-run] task metric detail"
node dist/index.js --dry-run engage +task_metric_detail --project_id "$PROJECT_ID" --task_id "$TASK_ID" --start_time 2026-04-01 --end_time 2026-04-07 --metric_id_list '["metric_1"]'

echo "[dry-run] manage task"
node dist/index.js --dry-run engage +manage_task --project_id "$PROJECT_ID" --task_id "$TASK_ID" --action pause
