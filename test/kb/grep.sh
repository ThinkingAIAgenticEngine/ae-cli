#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

HOST="${HOST:-https://example.com}"
QUERY="${QUERY:-sandbox configuration}"
SOURCES_DEFAULT='[{"scope":"company","name":"engineering-handbook"},{"scope":"system","name":"te-docs"}]'
SOURCES="${SOURCES:-$SOURCES_DEFAULT}"
PATHS_DEFAULT='["wiki/sandbox.md"]'
PATHS="${PATHS:-$PATHS_DEFAULT}"

echo "[dry-run] kb +grep (full payload, all flags supplied)"
node dist/index.js --dry-run --host "$HOST" kb +grep \
  --query "$QUERY" \
  --sources "$SOURCES" \
  --paths "$PATHS" \
  --top-k 10 \
  --locale zh

echo "[dry-run] kb +grep (short alias -q)"
node dist/index.js --dry-run --host "$HOST" kb +grep \
  -q "$QUERY" \
  --sources "$SOURCES" \
  --paths "$PATHS"

echo "[dry-run] kb +grep (single knowledge base)"
node dist/index.js --dry-run --host "$HOST" kb +grep \
  --query "$QUERY" \
  --sources '[{"scope":"system","name":"te-docs"}]' \
  --paths "$PATHS"

echo "[dry-run] kb +grep (paths JSON array)"
out="$(node dist/index.js --dry-run --host "$HOST" kb +grep \
  --query "$QUERY" \
  --sources "$SOURCES" \
  --paths '["wiki/a.md","wiki/b.md"]')"
echo "$out" | grep -q 'wiki/a.md' || { echo "  ERROR: expected wiki/a.md in body" >&2; echo "$out" >&2; exit 1; }
echo "$out" | grep -q 'wiki/b.md' || { echo "  ERROR: expected wiki/b.md in body" >&2; echo "$out" >&2; exit 1; }
echo "$out" | grep -q '"paths"' || { echo "  ERROR: expected paths field in body" >&2; echo "$out" >&2; exit 1; }
if echo "$out" | grep -q '"path":'; then
  echo "  ERROR: body must use paths, not path" >&2
  echo "$out" >&2
  exit 1
fi

echo "[validation] kb +grep missing required --query (should fail)"
if node dist/index.js --dry-run --host "$HOST" kb +grep \
  --sources "$SOURCES" \
  --paths "$PATHS" 2>/dev/null; then
  echo "  ERROR: expected failure, got success" >&2
  exit 1
else
  echo "  OK: command rejected as expected"
fi

echo "[validation] kb +grep missing required --sources (should fail)"
if node dist/index.js --dry-run --host "$HOST" kb +grep \
  --query "$QUERY" \
  --paths "$PATHS" 2>/dev/null; then
  echo "  ERROR: expected failure, got success" >&2
  exit 1
else
  echo "  OK: command rejected as expected"
fi

echo "[validation] kb +grep missing required --paths (should fail)"
if node dist/index.js --dry-run --host "$HOST" kb +grep \
  --query "$QUERY" \
  --sources "$SOURCES" 2>/dev/null; then
  echo "  ERROR: expected failure, got success" >&2
  exit 1
else
  echo "  OK: command rejected as expected"
fi

echo "[validation] kb +grep with malformed --sources JSON (should fail)"
if node dist/index.js --dry-run --host "$HOST" kb +grep \
  --query "$QUERY" \
  --sources 'not-json' \
  --paths "$PATHS" 2>/dev/null; then
  echo "  ERROR: expected failure, got success" >&2
  exit 1
else
  echo "  OK: command rejected as expected"
fi

echo "All kb +grep dry-run checks passed."
