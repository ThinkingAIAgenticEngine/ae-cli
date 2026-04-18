#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

PROJECT_ID="${PROJECT_ID:-1}"
TASK_ID="${TASK_ID:-task_123}"

echo "[dry-run] task list"
node dist/index.js --dry-run te-engage +task-list --project-id "$PROJECT_ID" --req '{"pageNum":1,"pageSize":20}'

echo "[dry-run] task stats"
node dist/index.js --dry-run te-engage +task-stats --project-id "$PROJECT_ID" --req '{"pageNum":1,"pageSize":20}'

echo "[dry-run] task detail"
node dist/index.js --dry-run te-engage +task-detail --project-id "$PROJECT_ID" --task-id "$TASK_ID"

echo "[dry-run] task data detail"
node dist/index.js --dry-run te-engage +task-data-detail --project-id "$PROJECT_ID" --task-id "$TASK_ID" --task-type normal --detail-type time --start-time 2026-04-01 --end-time 2026-04-07

echo "[dry-run] task metric detail"
node dist/index.js --dry-run te-engage +task-metric-detail --project-id "$PROJECT_ID" --task-id "$TASK_ID" --task-type normal --start-time 2026-04-01 --end-time 2026-04-07 --metric-id-list '["metric_1"]'

echo "[dry-run] manage task"
node dist/index.js --dry-run te-engage +manage-task --project-id "$PROJECT_ID" --task-id "$TASK_ID" --action pause

# Real call examples:
# node dist/index.js te-engage +task-list --project-id "$PROJECT_ID" --req '{"pageNum":1,"pageSize":20}'
# node dist/index.js te-engage +task-detail --project-id "$PROJECT_ID" --task-id "$TASK_ID"
