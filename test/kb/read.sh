#!/usr/bin/env bash
# kb +read dry-run 合同测试：--outline 两态透传（Ticket 11）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

HOST="${HOST:-https://example.com}"
SOURCE='{"scope":"company","name":"engineering-handbook"}'
PATH_ARG="wiki/sandbox.md"

run() { node dist/index.js --dry-run --host "$HOST" kb +read "$@"; }

echo "[contract] kb +read with --outline -> body carries \"outline\": true"
out="$(run --source "$SOURCE" --path "$PATH_ARG" --outline)"
echo "$out" | grep -q '"outline": *true' || {
  echo "  ERROR: expected \"outline\": true in dry-run body" >&2
  echo "$out" >&2
  exit 1
}
echo "  OK"

echo "[contract] kb +read without --outline -> body has no outline field"
out="$(run --source "$SOURCE" --path "$PATH_ARG" --offset 42 --limit 60)"
if echo "$out" | grep -q '"outline"'; then
  echo "  ERROR: outline must be absent when the flag is not supplied" >&2
  echo "$out" >&2
  exit 1
fi
echo "$out" | grep -q '"offset": *42' || { echo "  ERROR: expected offset passthrough" >&2; exit 1; }
echo "$out" | grep -q '"limit": *60' || { echo "  ERROR: expected limit passthrough" >&2; exit 1; }
echo "  OK"

echo "[contract] kb +read --outline combined with offset/limit -> both passthrough"
out="$(run --source "$SOURCE" --path "$PATH_ARG" --outline --offset 10 --limit 20)"
echo "$out" | grep -q '"outline": *true' || { echo "  ERROR: expected outline true" >&2; exit 1; }
echo "$out" | grep -q '"offset": *10' || { echo "  ERROR: expected offset passthrough" >&2; exit 1; }
echo "$out" | grep -q '"limit": *20' || { echo "  ERROR: expected limit passthrough" >&2; exit 1; }
echo "  OK"

echo "[validation] kb +read missing required --path (should fail)"
if run --source "$SOURCE" >/dev/null 2>&1; then
  echo "  ERROR: expected failure, got success" >&2
  exit 1
else
  echo "  OK: command rejected as expected"
fi

echo "All kb +read dry-run contract checks passed."
