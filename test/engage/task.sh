#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

PROJECT_ID="${PROJECT_ID:-1}"
TASK_ID="${TASK_ID:-task_123}"

echo "[dry-run] task list"
node dist/index.js --dry-run engage +task_list --project_id "$PROJECT_ID" --req '{"pageNum":1,"pageSize":20}'

echo "[dry-run] task stats"
node dist/index.js --dry-run engage +task_stats --project_id "$PROJECT_ID" --req '{"pageNum":1,"pageSize":20}'

echo "[dry-run] task detail"
node dist/index.js --dry-run engage +task_detail --project_id "$PROJECT_ID" --task_id "$TASK_ID"

echo "[dry-run] task data detail"
node dist/index.js --dry-run engage +task_data_detail --project_id "$PROJECT_ID" --task_id "$TASK_ID" --task_type normal --detail_type time --start_time 2026-04-01 --end_time 2026-04-07

echo "[dry-run] task metric detail"
node dist/index.js --dry-run engage +task_metric_detail --project_id "$PROJECT_ID" --task_id "$TASK_ID" --task_type normal --start_time 2026-04-01 --end_time 2026-04-07 --metric_id_list '["metric_1"]'

echo "[dry-run] manage task"
node dist/index.js --dry-run engage +manage_task --project_id "$PROJECT_ID" --task_id "$TASK_ID" --action pause