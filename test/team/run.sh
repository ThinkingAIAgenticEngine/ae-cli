#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

HOST="${HOST:-http://localhost:3000}"
TEAM_ID="${TEAM_ID:-team_test_123}"
RUN_ID="${RUN_ID:-run_test_456}"
SESSION_ID="${SESSION_ID:-session_test_789}"
export AE_API_PREFIX="${AE_API_PREFIX-}"

echo "=== team run dry-run tests ==="

# +run-start (required only)
echo "[dry-run] team +run-start (required only)"
node dist/index.js --dry-run --host "$HOST" team +run-start \
  --team-id "$TEAM_ID" \
  --input "分析上周用户留存数据" \
  --yes

# +run-start (with optional fields)
echo "[dry-run] team +run-start (with optional fields)"
node dist/index.js --dry-run --host "$HOST" team +run-start \
  --team-id "$TEAM_ID" \
  --input "生成月度报告" \
  --conversation-id "conv_001" \
  --notification '{"channels":["feishu"],"feishuChatId":"chat_001"}' \
  --save-to-kb-id "kb_001" \
  --project-ids '["proj_001","proj_002"]' \
  --yes

# +run-chat (required only)
echo "[dry-run] team +run-chat (required only)"
node dist/index.js --dry-run --host "$HOST" team +run-chat \
  --team-id "$TEAM_ID" \
  --input "帮我分析数据"

# +run-chat (with session-id for multi-turn)
echo "[dry-run] team +run-chat (with session-id)"
node dist/index.js --dry-run --host "$HOST" team +run-chat \
  --team-id "$TEAM_ID" \
  --input "继续上次的分析" \
  --session-id "$SESSION_ID"

# +run-cancel
echo "[dry-run] team +run-cancel"
node dist/index.js --dry-run --host "$HOST" team +run-cancel \
  --id "$RUN_ID" --yes

# +run-reply
echo "[dry-run] team +run-reply"
node dist/index.js --dry-run --host "$HOST" team +run-reply \
  --id "$RUN_ID" \
  --input "确认，请继续" \
  --yes

# +run-result
echo "[dry-run] team +run-result"
node dist/index.js --dry-run --host "$HOST" team +run-result \
  --id "$RUN_ID"

# +run-artifacts (metadata only)
echo "[dry-run] team +run-artifacts (metadata only)"
node dist/index.js --dry-run --host "$HOST" team +run-artifacts \
  --id "$RUN_ID"

# +run-artifacts (with type filter)
echo "[dry-run] team +run-artifacts (with type filter)"
node dist/index.js --dry-run --host "$HOST" team +run-artifacts \
  --id "$RUN_ID" \
  --artifact-type report

# +run-artifacts (with content)
echo "[dry-run] team +run-artifacts (with content)"
node dist/index.js --dry-run --host "$HOST" team +run-artifacts \
  --id "$RUN_ID" \
  --include-content true

echo ""
echo "=== validation tests ==="

# +run-start missing --team-id
echo "[validation] team +run-start missing --team-id (should fail)"
if node dist/index.js --dry-run --host "$HOST" team +run-start \
  --input "test" 2>/dev/null; then
  echo "  ERROR: expected failure, got success" >&2; exit 1
else
  echo "  OK: rejected as expected"
fi

# +run-start missing --input
echo "[validation] team +run-start missing --input (should fail)"
if node dist/index.js --dry-run --host "$HOST" team +run-start \
  --team-id "$TEAM_ID" 2>/dev/null; then
  echo "  ERROR: expected failure, got success" >&2; exit 1
else
  echo "  OK: rejected as expected"
fi

# +run-chat missing --team-id
echo "[validation] team +run-chat missing --team-id (should fail)"
if node dist/index.js --dry-run --host "$HOST" team +run-chat \
  --input "test" 2>/dev/null; then
  echo "  ERROR: expected failure, got success" >&2; exit 1
else
  echo "  OK: rejected as expected"
fi

# +run-chat missing --input
echo "[validation] team +run-chat missing --input (should fail)"
if node dist/index.js --dry-run --host "$HOST" team +run-chat \
  --team-id "$TEAM_ID" 2>/dev/null; then
  echo "  ERROR: expected failure, got success" >&2; exit 1
else
  echo "  OK: rejected as expected"
fi

# +run-cancel missing --id
echo "[validation] team +run-cancel missing --id (should fail)"
if node dist/index.js --dry-run --host "$HOST" team +run-cancel 2>/dev/null; then
  echo "  ERROR: expected failure, got success" >&2; exit 1
else
  echo "  OK: rejected as expected"
fi

# +run-reply missing --id
echo "[validation] team +run-reply missing --id (should fail)"
if node dist/index.js --dry-run --host "$HOST" team +run-reply \
  --input "test" 2>/dev/null; then
  echo "  ERROR: expected failure, got success" >&2; exit 1
else
  echo "  OK: rejected as expected"
fi

# +run-reply missing --input
echo "[validation] team +run-reply missing --input (should fail)"
if node dist/index.js --dry-run --host "$HOST" team +run-reply \
  --id "$RUN_ID" 2>/dev/null; then
  echo "  ERROR: expected failure, got success" >&2; exit 1
else
  echo "  OK: rejected as expected"
fi

# +run-result missing --id
echo "[validation] team +run-result missing --id (should fail)"
if node dist/index.js --dry-run --host "$HOST" team +run-result 2>/dev/null; then
  echo "  ERROR: expected failure, got success" >&2; exit 1
else
  echo "  OK: rejected as expected"
fi

# +run-artifacts missing --id
echo "[validation] team +run-artifacts missing --id (should fail)"
if node dist/index.js --dry-run --host "$HOST" team +run-artifacts 2>/dev/null; then
  echo "  ERROR: expected failure, got success" >&2; exit 1
else
  echo "  OK: rejected as expected"
fi

echo ""
echo "All team run dry-run checks passed."

# Real call examples (uncomment to run against a live server):
# AE_API_PREFIX= node dist/index.js --host "$HOST" team +run-start --team-id <id> --input "分析数据"
# AE_API_PREFIX= node dist/index.js --host "$HOST" team +run-result --id <run_id>
# AE_API_PREFIX= node dist/index.js --host "$HOST" team +run-artifacts --id <run_id>
