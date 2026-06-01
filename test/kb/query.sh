#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

HOST="${HOST:-https://example.com}"
QUERY="${QUERY:-如何配置 sandbox 容器？}"
SOURCES_DEFAULT='[{"scope":"company","name":"engineering-handbook"},{"scope":"system","name":"te-docs"}]'
SOURCES="${SOURCES:-$SOURCES_DEFAULT}"
MODEL_ID="${MODEL_ID:-AE-Auto}"
MAX_TURNS="${MAX_TURNS:-6}"

echo "[dry-run] kb +query (full payload, all flags supplied)"
node dist/index.js --dry-run --host "$HOST" kb +query \
  --query "$QUERY" \
  --sources "$SOURCES" \
  --model-id "$MODEL_ID" \
  --max-turns "$MAX_TURNS"

echo "[dry-run] kb +query (short alias -q, defaults applied for model-id and max-turns)"
node dist/index.js --dry-run --host "$HOST" kb +query \
  -q "$QUERY" \
  --sources "$SOURCES"

echo "[dry-run] kb +query (single knowledge base)"
node dist/index.js --dry-run --host "$HOST" kb +query \
  --query "$QUERY" \
  --sources '[{"scope":"system","name":"te-docs"}]'

echo "[dry-run] kb +query (custom model and turns)"
node dist/index.js --dry-run --host "$HOST" kb +query \
  --query "$QUERY" \
  --sources "$SOURCES" \
  --model-id custom-model \
  --max-turns 10

echo "[validation] kb +query missing required --query (should fail)"
if node dist/index.js --dry-run --host "$HOST" kb +query \
  --sources "$SOURCES" 2>/dev/null; then
  echo "  ERROR: expected failure, got success" >&2
  exit 1
else
  echo "  OK: command rejected as expected"
fi

echo "[validation] kb +query missing required --sources (should fail)"
if node dist/index.js --dry-run --host "$HOST" kb +query \
  --query "$QUERY" 2>/dev/null; then
  echo "  ERROR: expected failure, got success" >&2
  exit 1
else
  echo "  OK: command rejected as expected"
fi

echo "[validation] kb +query with malformed --sources JSON (should fail)"
if node dist/index.js --dry-run --host "$HOST" kb +query \
  --query "$QUERY" \
  --sources 'not-json' 2>/dev/null; then
  echo "  ERROR: expected failure, got success" >&2
  exit 1
else
  echo "  OK: command rejected as expected"
fi

echo "All kb +query dry-run checks passed."
