#!/usr/bin/env bash
# kb +ask dry-run contract tests: submit, --no-wait, +ask-status (Ticket 02)
# Poll-to-completed is execute-time; covered by tests/kb-ask-command.test.ts.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

HOST="${HOST:-https://example.com}"
QUESTION="${QUESTION:-What is the sandbox configuration?}"
SOURCES_DEFAULT='[{"scope":"company","name":"engineering-handbook"}]'
SOURCES="${SOURCES:-$SOURCES_DEFAULT}"

run() { node dist/index.js --dry-run --host "$HOST" kb +ask "$@"; }
run_status() { node dist/index.js --dry-run --host "$HOST" kb +ask-status "$@"; }

echo "[contract] kb +ask with all parameters -> POST /ask with body"
out="$(run --question "$QUESTION" --sources "$SOURCES" --model-id claude-sonnet-4-6 --max-turns 50 --locale zh)"
echo "$out" | grep -q '"method"' || { echo "  ERROR: expected method field" >&2; echo "$out" >&2; exit 1; }
echo "$out" | grep -q 'POST' || { echo "  ERROR: expected POST method" >&2; echo "$out" >&2; exit 1; }
echo "$out" | grep -q '/agent/api/external/knowledge-bases/ask' || { echo "  ERROR: expected API path in url" >&2; exit 1; }
echo "$out" | grep -q '"question"' || { echo "  ERROR: expected question in body" >&2; exit 1; }
echo "$out" | grep -q '"modelId"' || { echo "  ERROR: expected modelId in body" >&2; exit 1; }
echo "$out" | grep -q 'claude-sonnet-4-6' || { echo "  ERROR: expected modelId value in body" >&2; exit 1; }
echo "$out" | grep -q '"maxTurns"' || { echo "  ERROR: expected maxTurns in body" >&2; exit 1; }
echo "$out" | grep -q '"locale"' || { echo "  ERROR: expected locale in body" >&2; exit 1; }
echo "  OK"

echo "[contract] kb +ask --no-wait -> same POST request (flag is execute-time only)"
out="$(run --question "$QUESTION" --no-wait)"
echo "$out" | grep -q '"method"' || { echo "  ERROR: expected method field" >&2; exit 1; }
echo "$out" | grep -q 'POST' || { echo "  ERROR: expected POST method" >&2; exit 1; }
echo "$out" | grep -q '/agent/api/external/knowledge-bases/ask' || { echo "  ERROR: expected API path in url" >&2; exit 1; }
echo "  OK"

echo "[contract] kb +ask-status --execution-id <id> -> GET with query param"
out="$(run_status --execution-id abc123-def456)"
echo "$out" | grep -q '"method"' || { echo "  ERROR: expected method field" >&2; exit 1; }
echo "$out" | grep -q 'GET' || { echo "  ERROR: expected GET method" >&2; exit 1; }
echo "$out" | grep -q '[?]' || { echo "  ERROR: expected query param separator" >&2; exit 1; }
echo "$out" | grep -q 'executionId' || { echo "  ERROR: expected executionId query param" >&2; exit 1; }
echo "$out" | grep -q 'abc123-def456' || { echo "  ERROR: expected executionId value in URL" >&2; exit 1; }
echo "  OK"

echo "[validation] kb +ask missing required --question (should fail)"
if run --sources "$SOURCES" >/dev/null 2>&1; then
  echo "  ERROR: expected failure, got success" >&2
  exit 1
else
  echo "  OK: command rejected as expected"
fi

echo "[validation] kb +ask-status missing required --execution-id (should fail)"
if run_status >/dev/null 2>&1; then
  echo "  ERROR: expected failure, got success" >&2
  exit 1
else
  echo "  OK: command rejected as expected"
fi

echo "[validation] kb +ask with invalid --locale (should fail)"
if run --question "$QUESTION" --locale xx >/dev/null 2>&1; then
  echo "  ERROR: expected failure, got success" >&2
  exit 1
else
  echo "  OK: command rejected as expected"
fi

echo "All kb +ask dry-run contract checks passed."
