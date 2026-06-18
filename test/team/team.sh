#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

HOST="${HOST:-http://localhost:3000}"
TEAM_ID="${TEAM_ID:-team_test_123}"
export AE_API_PREFIX="${AE_API_PREFIX-}"

echo "=== team management dry-run tests ==="

# +list
echo "[dry-run] team +list"
node dist/index.js --dry-run --host "$HOST" team +list

# +create (full payload)
echo "[dry-run] team +create (full payload)"
node dist/index.js --dry-run --host "$HOST" team +create \
  --name "测试团队" \
  --config '{"version":1,"mode":"serial","steps":[{"id":"s1","name":"分析师","agentId":"agent_001","prompt":"分析数据","role":"agent"}]}' \
  --description "用于测试" \
  --scope personal \
  --yes

# +create (required only)
echo "[dry-run] team +create (required only)"
node dist/index.js --dry-run --host "$HOST" team +create \
  --name "最小团队" \
  --config '{"version":1,"mode":"serial","steps":[{"id":"s1","name":"step1","agentId":"agent_001","prompt":"test","role":"agent"}]}' \
  --yes

# +update (name only)
echo "[dry-run] team +update (name)"
node dist/index.js --dry-run --host "$HOST" team +update \
  --id "$TEAM_ID" --name "新名称" --yes

# +update (config)
echo "[dry-run] team +update (config)"
node dist/index.js --dry-run --host "$HOST" team +update \
  --id "$TEAM_ID" \
  --config '{"version":1,"mode":"parallel","steps":[{"id":"s1","name":"step1","agentId":"agent_001","prompt":"test","role":"agent"}]}' \
  --yes

# +update (enabled false)
echo "[dry-run] team +update (disable)"
node dist/index.js --dry-run --host "$HOST" team +update \
  --id "$TEAM_ID" --enabled false --yes

# +delete
echo "[dry-run] team +delete"
node dist/index.js --dry-run --host "$HOST" team +delete \
  --id "$TEAM_ID" --yes

# +ai-generate (required only)
echo "[dry-run] team +ai-generate (prompt only)"
node dist/index.js --dry-run --host "$HOST" team +ai-generate \
  --prompt "需要一个能分析用户留存并生成周报的团队"

# +ai-generate (with model)
echo "[dry-run] team +ai-generate (with model)"
node dist/index.js --dry-run --host "$HOST" team +ai-generate \
  --prompt "分析用户行为" --model "claude-3-5-sonnet"

# +list-templates (default locale)
echo "[dry-run] team +list-templates (default)"
node dist/index.js --dry-run --host "$HOST" team +list-templates

# +list-templates (en)
echo "[dry-run] team +list-templates (locale en)"
node dist/index.js --dry-run --host "$HOST" team +list-templates --locale en

echo ""
echo "=== validation tests ==="

# +create missing --name
echo "[validation] team +create missing --name (should fail)"
if node dist/index.js --dry-run --host "$HOST" team +create \
  --config '{"version":1}' 2>/dev/null; then
  echo "  ERROR: expected failure, got success" >&2; exit 1
else
  echo "  OK: rejected as expected"
fi

# +create missing --config
echo "[validation] team +create missing --config (should fail)"
if node dist/index.js --dry-run --host "$HOST" team +create \
  --name "test" 2>/dev/null; then
  echo "  ERROR: expected failure, got success" >&2; exit 1
else
  echo "  OK: rejected as expected"
fi

# +create invalid --scope
echo "[validation] team +create invalid --scope (should fail)"
if node dist/index.js --dry-run --host "$HOST" team +create \
  --name "test" --config '{}' --scope invalid 2>/dev/null; then
  echo "  ERROR: expected failure, got success" >&2; exit 1
else
  echo "  OK: rejected as expected"
fi

# +update missing --id
echo "[validation] team +update missing --id (should fail)"
if node dist/index.js --dry-run --host "$HOST" team +update \
  --name "test" 2>/dev/null; then
  echo "  ERROR: expected failure, got success" >&2; exit 1
else
  echo "  OK: rejected as expected"
fi

# +delete missing --id
echo "[validation] team +delete missing --id (should fail)"
if node dist/index.js --dry-run --host "$HOST" team +delete 2>/dev/null; then
  echo "  ERROR: expected failure, got success" >&2; exit 1
else
  echo "  OK: rejected as expected"
fi

# +ai-generate missing --prompt
echo "[validation] team +ai-generate missing --prompt (should fail)"
if node dist/index.js --dry-run --host "$HOST" team +ai-generate 2>/dev/null; then
  echo "  ERROR: expected failure, got success" >&2; exit 1
else
  echo "  OK: rejected as expected"
fi

echo ""
echo "All team management dry-run checks passed."

# Real call examples (uncomment to run against a live server):
# AE_API_PREFIX= node dist/index.js --host "$HOST" team +list
# AE_API_PREFIX= node dist/index.js --host "$HOST" team +list-templates
# AE_API_PREFIX= node dist/index.js --host "$HOST" team +ai-generate --prompt "分析用户留存"
