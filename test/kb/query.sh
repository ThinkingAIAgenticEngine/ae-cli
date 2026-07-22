#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

HOST="${HOST:-https://example.com}"
QUERY="${QUERY:-How to configure sandbox?}"
SOURCES_DEFAULT='[{"scope":"company","name":"engineering-handbook"},{"scope":"system","name":"te-docs"}]'
SOURCES="${SOURCES:-$SOURCES_DEFAULT}"

echo "[dry-run] kb +query (full payload, all flags supplied)"
node dist/index.js --dry-run --host "$HOST" kb +query \
  --query "$QUERY" \
  --sources "$SOURCES" \
  --top-k 10 \
  --locale zh

echo "[dry-run] kb +query (short alias -q)"
node dist/index.js --dry-run --host "$HOST" kb +query \
  -q "$QUERY" \
  --sources "$SOURCES"

echo "[dry-run] kb +query (single knowledge base)"
node dist/index.js --dry-run --host "$HOST" kb +query \
  --query "$QUERY" \
  --sources '[{"scope":"system","name":"te-docs"}]'

echo "[dry-run] kb +query (query only, no --sources)"
node dist/index.js --dry-run --host "$HOST" kb +query \
  --query "$QUERY"

echo "[validation] kb +query missing required --query (should fail)"
if node dist/index.js --dry-run --host "$HOST" kb +query \
  --sources "$SOURCES" 2>/dev/null; then
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
