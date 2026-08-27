import type { HandoffIndexEntry } from './handoff.js';
import { sourceColumns } from './mapping.js';
import { MAPPING_VERSION } from './types.js';
import type { LocalDataFormat, LocalDataMapping } from './types.js';

/**
 * Relay package generators: the DataX-style declarative descriptor plus the
 * generic stage executors that read it. The executors dispatch each stage by
 * its `type` to `ae-cli data-integration` subcommands — no plugin runtime here.
 * Only `source: local_file` and `sink: restful_sync_json` are implemented; the
 * `type` fields reserve logbus / datax / mysql for later phases.
 */

export const PIPELINE_VERSION = 'ae-data-integration-pipeline/v1';
export const SHAPE_VERSION = 'ae-data-integration-shape/v1';

const DEFAULT_BATCH_SIZE = 500;
const ENV_FILE = '.local/target.env';

export interface RelayFile {
  relPath: string;
  content: string;
  mode: number;
}

export interface PipelineTarget {
  /** Recorded receiver base URL (pushurl). The sink executor appends /sync_json. */
  pushurl?: string;
  /** Recorded destination project ID, used to derive the APPID at upload time. */
  project_id?: string;
}

export interface PipelineDescriptor {
  version: typeof PIPELINE_VERSION;
  created_at: string;
  source: { type: 'local_file'; params: { format: LocalDataFormat } };
  transform: { type: typeof MAPPING_VERSION; refs: string[] };
  sink: {
    type: 'restful_sync_json';
    params: { batch_size: number; env_file: string; pushurl?: string; project_id?: string };
  };
}

/**
 * The runtime view of the package: which frozen mappings the pipeline runs, plus
 * the recorded upload target (pushurl / project_id) when the handoff captured it.
 * The target is recorded as a convenience default — reuse still requires the
 * operator to confirm the address and project before any upload.
 */
export function buildPipelineDescriptor(entries: HandoffIndexEntry[], target: PipelineTarget = {}): PipelineDescriptor {
  const first = entries[0];
  return {
    version: PIPELINE_VERSION,
    created_at: first?.created_at ?? new Date().toISOString(),
    source: { type: 'local_file', params: { format: first?.format ?? 'csv' } },
    transform: { type: MAPPING_VERSION, refs: entries.map((entry) => entry.mapping_file) },
    sink: {
      type: 'restful_sync_json',
      params: {
        batch_size: DEFAULT_BATCH_SIZE,
        env_file: ENV_FILE,
        ...(target.pushurl ? { pushurl: target.pushurl } : {}),
        ...(target.project_id ? { project_id: target.project_id } : {}),
      },
    },
  };
}

export interface ShapeEntry {
  fingerprint: string;
  mode: LocalDataMapping['mode'];
  data_set: string;
  format: LocalDataFormat;
  /** Source columns the frozen mapping consumes, sorted — the shape gate baseline. */
  columns: string[];
}

/** Column-set baseline per mapping, keyed by the same structure fingerprint as the index. */
export function buildShapeBaseline(items: Array<{ mapping: LocalDataMapping; fingerprint: string }>): {
  version: typeof SHAPE_VERSION;
  entries: ShapeEntry[];
} {
  return {
    version: SHAPE_VERSION,
    entries: items.map(({ mapping, fingerprint }) => ({
      fingerprint,
      mode: mapping.mode,
      data_set: mapping.source.data_set,
      format: mapping.source.format,
      columns: sourceColumns(mapping),
    })),
  };
}

/** Shell scripts are assembled line-by-line so `${...}` never hits TS interpolation. */
function sh(...lines: string[]): string {
  return `${lines.join('\n')}\n`;
}

export function generateBinScripts(): RelayFile[] {
  return [
    { relPath: 'bin/run.sh', content: runSh(), mode: 0o700 },
    { relPath: 'bin/upload.sh', content: uploadSh(), mode: 0o700 },
    { relPath: 'bin/bind_mapping.py', content: bindMappingPy(), mode: 0o700 },
    { relPath: 'bin/summarize.py', content: summarizePy(), mode: 0o700 },
    { relPath: 'bin/plan_check.py', content: planCheckPy(), mode: 0o700 },
    { relPath: 'bin/verify.py', content: verifyPy(), mode: 0o700 },
    { relPath: 'bin/resolve_appid.py', content: resolveAppidPy(), mode: 0o700 },
  ];
}

function runSh(): string {
  return sh(
    '#!/usr/bin/env bash',
    '# Generic pipeline executor: source -> transform -> plan. Never uploads (see upload.sh).',
    '# Reads pipeline.json and dispatches each stage by its `type` to ae-cli subcommands.',
    'set -euo pipefail',
    'SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"',
    'PKG_ROOT="$(dirname "$SCRIPT_DIR")"',
    'cd "$PKG_ROOT"',
    '',
    'SRC_TYPE="$(python3 -c \'import json; print(json.load(open("pipeline.json"))["source"]["type"])\')"',
    'case "$SRC_TYPE" in',
    '  local_file) ;;',
    '  *)',
    '    echo "unsupported source type: $SRC_TYPE" >&2',
    '    echo "re-run the full ae-data-integration pipeline (or upgrade ae-cli) for this source." >&2',
    '    exit 64',
    '    ;;',
    'esac',
    '',
    'INPUT="${1:-}"',
    'if [ -z "$INPUT" ]; then',
    '  shopt -s nullglob; FILES=(inbox/*); shopt -u nullglob',
    '  if [ "${#FILES[@]}" -ne 1 ]; then',
    '    echo "usage: bin/run.sh <input-file>" >&2',
    '    echo "       (or put exactly one file in inbox/)" >&2',
    '    exit 2',
    '  fi',
    '  INPUT="${FILES[0]}"',
    'fi',
    '',
    'RUN_DIR="runs/$(date +%Y%m%d-%H%M%S)"',
    'mkdir -p "$RUN_DIR"',
    'echo "run: $RUN_DIR"',
    '',
    'python3 bin/bind_mapping.py "$INPUT" "$RUN_DIR"',
    '',
    'while IFS= read -r ref; do',
    '  ref_dir="$(dirname "$ref")"',
    '  echo "convert: $ref_dir"',
    '  ae-cli data-integration convert \\',
    '    --input-file "$INPUT" \\',
    '    --mapping "$RUN_DIR/bound/$ref_dir/mapping.json" \\',
    '    --output-dir "$RUN_DIR/$ref_dir" || exit $?',
    'done < <(python3 -c \'import json,sys; print("\\n".join(json.load(open("pipeline.json"))["transform"]["refs"]))\')',
    '',
    'python3 bin/summarize.py "$RUN_DIR"',
    'python3 bin/plan_check.py "$RUN_DIR"',
    '',
    '# Salvage hint: quarantined rows are never silently dropped. Re-process only',
    '# them against the fixed mapping instead of re-uploading the whole file.',
    'while IFS= read -r ref; do',
    '  ref_dir="$(dirname "$ref")"',
    '  inv="$RUN_DIR/$ref_dir/invalid.rows.jsonl"',
    '  if [ -s "$inv" ]; then',
    '    echo "note: $inv has quarantined rows — salvage them with:"',
    '    echo "  ae-cli data-integration convert --input-file \"$INPUT\" --mapping \"$RUN_DIR/bound/$ref_dir/mapping.json\" --salvage-from \"$inv\" --output-dir \"$RUN_DIR-salvage\""',
    '  fi',
    'done < <(python3 -c \'import json,sys; print("\\n".join(json.load(open("pipeline.json"))["transform"]["refs"]))\')',
    '',
    'echo "done. review the summary and plan check, then run: bin/upload.sh $RUN_DIR"',
  );
}

function uploadSh(): string {
  return sh(
    '#!/usr/bin/env bash',
    '# Sink executor. Dry-run by default; --confirm actually uploads.',
    '# Resolves the recorded target from pipeline.json (pushurl + project_id), derives',
    '# the APPID via `ae-cli project info get` (bin/resolve_appid.py), and falls back to',
    '# .local/target.env for explicit APPID / endpoint / project-id overrides.',
    'set -euo pipefail',
    'SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"',
    'PKG_ROOT="$(dirname "$SCRIPT_DIR")"',
    'cd "$PKG_ROOT"',
    '',
    'SINK_TYPE="$(python3 -c \'import json; print(json.load(open("pipeline.json"))["sink"]["type"])\')"',
    'case "$SINK_TYPE" in',
    '  restful_sync_json) ;;',
    '  *)',
    '    echo "unsupported sink type: $SINK_TYPE" >&2',
    '    echo "re-run the full ae-data-integration pipeline (or upgrade ae-cli) for this sink." >&2',
    '    exit 64',
    '    ;;',
    'esac',
    '',
    'SINK_PARAMS="$(python3 -c \'import json; print(json.dumps(json.load(open("pipeline.json"))["sink"]["params"]))\')"',
    'BATCH_SIZE="$(python3 -c \'import json,sys; print(json.loads(sys.argv[1]).get("batch_size", 500))\' "$SINK_PARAMS")"',
    'ENV_FILE="$(python3 -c \'import json,sys; print(json.loads(sys.argv[1]).get("env_file", ".local/target.env"))\' "$SINK_PARAMS")"',
    'PUSHURL="$(python3 -c \'import json,sys; print(json.loads(sys.argv[1]).get("pushurl") or "")\' "$SINK_PARAMS")"',
    'PROJECT_ID="$(python3 -c \'import json,sys; print(json.loads(sys.argv[1]).get("project_id") or "")\' "$SINK_PARAMS")"',
    '',
    'CONFIRM=0',
    'RUN_DIR=""',
    'for arg in "$@"; do',
    '  case "$arg" in',
    '    --confirm) CONFIRM=1 ;;',
    '    -*) echo "unknown flag: $arg" >&2; exit 2 ;;',
    '    *) RUN_DIR="$arg" ;;',
    '  esac',
    'done',
    '',
    'if [ -z "$RUN_DIR" ]; then',
    '  echo "usage: bin/upload.sh [--confirm] <runs/<run-id>>" >&2',
    '  exit 2',
    'fi',
    '',
    '# .local/target.env is optional: the package may record the target itself.',
    '# Env values still win as explicit overrides (the documented fallback).',
    'if [ -f "$ENV_FILE" ]; then set -a; . "$ENV_FILE"; set +a; fi',
    '[ -z "$PROJECT_ID" ] && PROJECT_ID="${AE_PROJECT_ID:-}"',
    '',
    '# Endpoint: the recorded pushurl (a receiver base URL; append /sync_json), else AE_ENDPOINT.',
    'if [ -n "$PUSHURL" ]; then',
    '  case "$PUSHURL" in',
    '    */sync_json) ENDPOINT="$PUSHURL" ;;',
    '    *) ENDPOINT="${PUSHURL%/}/sync_json" ;;',
    '  esac',
    'else',
    '  : "${AE_ENDPOINT:?set AE_ENDPOINT in .local/target.env (or record pushurl at handoff)}"',
    '  ENDPOINT="$AE_ENDPOINT"',
    'fi',
    '',
    '# APPID: explicit env wins, else derive from the recorded project via project info get.',
    'APPID="${AE_APPID:-}"',
    'if [ -z "$APPID" ] && [ -n "$PROJECT_ID" ]; then',
    '  APPID="$(python3 bin/resolve_appid.py "$PROJECT_ID")"',
    'fi',
    ': "${APPID:?set AE_APPID in .local/target.env (or record project_id at handoff)}"',
    '',
    '# Mask the APPID in anything this script prints — it must never land in logs.',
    'mask() {',
    '  local a="$1"',
    '  if [ "${#a}" -le 4 ]; then printf "%s" "****"; return; fi',
    '  printf "%s%s" "$(printf "%*s" "$(( ${#a} - 4 ))" "" | tr " " "*")" "${a: -4}"',
    '}',
    'display_args() {',
    '  local args=("$@") out=() i',
    '  for ((i=0; i<${#args[@]}; i++)); do',
    '    if [ "${args[$i]}" = "--appid" ] && [ -n "${args[$((i+1))]:-}" ]; then',
    '      out+=("--appid" "$(mask "${args[$((i+1))]}")")',
    '      i=$((i+1))',
    '    else',
    '      out+=("${args[$i]}")',
    '    fi',
    '  done',
    '  printf "%s\\n" "${out[*]}"',
    '}',
    '',
    'echo "target: project_id=${PROJECT_ID:-<unset>}"',
    'echo "        endpoint=$ENDPOINT"',
    'echo "        appid=$(mask "$APPID")"',
    'if [ "$CONFIRM" -eq 0 ]; then',
    '  echo "dry-run — re-run with --confirm to upload to this address and project."',
    'else',
    '  echo "confirmed: uploading to the address and project shown above."',
    'fi',
    '',
    'FLAGS=(--endpoint "$ENDPOINT" --appid "$APPID" --batch-size "$BATCH_SIZE")',
    'if [ "$CONFIRM" -eq 0 ]; then FLAGS+=(--dry-run); fi',
    '',
    'while IFS= read -r ref; do',
    '  ref_dir="$(dirname "$ref")"',
    '  ue="$RUN_DIR/$ref_dir/valid.ue.jsonl"',
    '  manifest="$RUN_DIR/$ref_dir/manifest.json"',
    '  if [ ! -f "$ue" ]; then',
    '    echo "missing $ue (run bin/run.sh first)" >&2',
    '    exit 2',
    '  fi',
    '  status="$(python3 -c \'import json,sys; print(json.load(open(sys.argv[1]))["status"])\' "$manifest")"',
    '  args=("${FLAGS[@]}" --ue-file "$ue" --manifest "$manifest")',
    '  if [ "$status" = "blocked" ]; then',
    '    echo "manifest $manifest is blocked (rows were quarantined)."',
    '    echo "Uploading passes only the valid subset (--allow-clean-subset); quarantined rows stay in invalid.rows.jsonl."',
    '    if [ "$CONFIRM" -eq 1 ]; then args+=(--allow-clean-subset); else echo "  (dry-run) re-run with --confirm to accept the clean subset."; fi',
    '  fi',
    '  echo "> ae-cli data-integration upload $(display_args "${args[@]}")"',
    '  ae-cli data-integration upload "${args[@]}" || exit $?',
    'done < <(python3 -c \'import json,sys; print("\\n".join(json.load(open("pipeline.json"))["transform"]["refs"]))\')',
  );
}

function bindMappingPy(): string {
  return `#!/usr/bin/env python3
"""Source stage: rebind the frozen mappings to a new same-shape file.

Runs \`ae-cli data-integration inspect\` once, then for every mapping the
pipeline references (pipeline.json's transform.refs) re-binds the frozen
mapping's \`source.sha256\` and \`source.data_set\` to the new file (identity
fields only — business logic is untouched), after checking the column set
against shape.json. Historical index entries the pipeline does not run are
left alone — the index accumulates across handoffs in the same directory.

Usage: bin/bind_mapping.py <input-file> <run-dir>
"""
import json
import os
import subprocess
import sys


def fail(message):
    print(f"bind_mapping: {message}", file=sys.stderr)
    sys.exit(1)


def pkg_root():
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def write_json(path, value):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(value, f, ensure_ascii=False, indent=2)
        f.write("\\n")


def dataset_key(dataset):
    return dataset.get("id") or dataset.get("label") or ""


def main():
    if len(sys.argv) != 3:
        fail("usage: bind_mapping.py <input-file> <run-dir>")
    input_file, run_dir = sys.argv[1], sys.argv[2]
    root = pkg_root()

    pipeline = load_json(os.path.join(root, "pipeline.json"))
    if pipeline["source"]["type"] != "local_file":
        fail(f"unsupported source type: {pipeline['source']['type']}")

    index = load_json(os.path.join(root, "index.json"))
    shape = load_json(os.path.join(root, "shape.json"))
    shape_by_fp = {entry["fingerprint"]: entry for entry in shape["entries"]}
    index_by_ref = {entry["mapping_file"]: entry for entry in index["entries"]}

    inspect = run_inspect(input_file)
    datasets = extract_datasets(inspect)
    headers_by_dataset = extract_headers(inspect, datasets)
    sha = (inspect.get("source") or {}).get("sha256")

    # Rebind only the mappings this pipeline runs (transform.refs). The index
    # accumulates entries across handoffs in the same directory; earlier entries
    # may have no shape baseline here and are never converted by run.sh, so
    # walking the whole index would fail on them.
    for ref in pipeline["transform"]["refs"]:
        entry = index_by_ref.get(ref)
        if entry is None:
            fail(f"index entry missing for {ref}; re-run the full pipeline")
        fingerprint = entry["fingerprint"]
        baseline = shape_by_fp.get(fingerprint)
        if baseline is None:
            fail(f"shape baseline missing for {fingerprint}; re-run the full pipeline")
        frozen = load_json(os.path.join(root, ref))
        data_set_id = match_dataset(frozen, baseline, datasets, headers_by_dataset)
        validate_headers(data_set_id, baseline, headers_by_dataset)
        frozen["source"]["sha256"] = sha
        frozen["source"]["data_set"] = data_set_id
        out = os.path.join(root, run_dir, "bound", os.path.dirname(ref), "mapping.json")
        write_json(out, frozen)
        print(f"rebound {os.path.dirname(ref)} -> data_set {data_set_id!r}")
    print("shape check passed")


def run_inspect(input_file):
    proc = subprocess.run(
        ["ae-cli", "data-integration", "inspect", "--input-file", input_file],
        capture_output=True, text=True,
    )
    if proc.returncode != 0:
        fail(f"inspect failed: {proc.stderr.strip()}")
    try:
        parsed = json.loads(proc.stdout)
    except json.JSONDecodeError:
        fail("inspect returned non-JSON output")
    # ae-cli wraps every command result in { ok, data, error }; unwrap it.
    data = parsed.get("data") if isinstance(parsed, dict) else None
    if not isinstance(data, dict):
        fail("inspect returned no data payload")
    return data


def extract_datasets(inspect):
    if inspect.get("selection_required"):
        return inspect.get("data_sets") or []
    data_set = inspect.get("data_set")
    return [data_set] if data_set else []


def extract_headers(inspect, datasets):
    result = {}
    details = inspect.get("header_details")
    if details:
        for dataset in datasets:
            names = (dataset.get("label"), dataset.get("id"), dataset.get("selector"))
            for sheet in details:
                if sheet.get("name") in names:
                    result[dataset_key(dataset)] = sheet.get("headers") or []
                    break
        return result
    columns = inspect.get("columns")
    if columns and datasets:
        result[dataset_key(datasets[0])] = [column["name"] for column in columns]
    return result


def match_dataset(frozen, baseline, datasets, headers_by_dataset):
    if not datasets:
        fail("inspect reported no data sets")
    wanted = frozen["source"]["data_set"]
    for dataset in datasets:
        if dataset.get("id") == wanted:
            return dataset.get("id")
    for dataset in datasets:
        if dataset.get("label") == wanted:
            return dataset.get("id")
    baseline_cols = set(baseline.get("columns") or [])
    if baseline_cols:
        for dataset in datasets:
            headers = headers_by_dataset.get(dataset_key(dataset))
            if headers and set(headers) == baseline_cols:
                return dataset.get("id")
    if len(datasets) == 1:
        return datasets[0].get("id")
    fail(f"cannot rebind data_set {wanted!r}: no exact or header match; re-run the full pipeline")


def validate_headers(data_set_id, baseline, headers_by_dataset):
    baseline_cols = set(baseline.get("columns") or [])
    if not baseline_cols:
        return
    headers = headers_by_dataset.get(data_set_id)
    if headers is None:
        return
    if set(headers) != baseline_cols:
        missing = sorted(baseline_cols - set(headers))
        extra = sorted(set(headers) - baseline_cols)
        fail(
            f"shape mismatch for {data_set_id!r}: missing={missing} extra={extra} — "
            "re-run the full pipeline; do not edit the frozen mapping"
        )


if __name__ == "__main__":
    main()
`;
}

function summarizePy(): string {
  return `#!/usr/bin/env python3
"""Transform stage summary: print valid/quarantined counts per data set."""
import json
import os
import sys


def pkg_root():
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    if len(sys.argv) != 2:
        print("usage: summarize.py <run-dir>", file=sys.stderr)
        sys.exit(2)
    run_dir = sys.argv[1]
    root = pkg_root()
    with open(os.path.join(root, "pipeline.json"), "r", encoding="utf-8") as f:
        pipeline = json.load(f)
    total_valid = 0
    total_invalid = 0
    for ref in pipeline["transform"]["refs"]:
        ref_dir = os.path.dirname(ref)
        manifest_path = os.path.join(root, run_dir, ref_dir, "manifest.json")
        if not os.path.exists(manifest_path):
            continue
        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)
        output = manifest["output"]
        total_valid += output["valid_records"]
        total_invalid += output["invalid_records"]
        print(f"{ref_dir}: {output['valid_records']} valid / {output['invalid_records']} quarantined")
        for reason in manifest.get("blocked_reasons") or []:
            print(f"  - {reason}")
    print(f"total: {total_valid} valid / {total_invalid} quarantined")


if __name__ == "__main__":
    main()
`;
}

function planCheckPy(): string {
  return `#!/usr/bin/env python3
"""Plan gate: every event and property produced must already exist in the frozen tracking plan."""
import json
import os
import sys


def pkg_root():
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def main():
    if len(sys.argv) != 2:
        print("usage: plan_check.py <run-dir>", file=sys.stderr)
        sys.exit(2)
    run_dir = sys.argv[1]
    root = pkg_root()
    pipeline = load_json(os.path.join(root, "pipeline.json"))
    new_events = []
    new_properties = []
    missing_plans = []
    for ref in pipeline["transform"]["refs"]:
        ref_dir = os.path.dirname(ref)
        plan_path = os.path.join(root, ref_dir, "plan.json")
        ue_path = os.path.join(root, run_dir, ref_dir, "valid.ue.jsonl")
        if not os.path.exists(plan_path):
            missing_plans.append(ref_dir)
            continue
        plan = load_json(plan_path)
        plan_events = {event["event_name"] for event in plan.get("events", [])}
        plan_properties = {prop["name"] for prop in plan.get("event_properties", [])}
        plan_properties |= {prop["name"] for prop in plan.get("common_event_properties", [])}
        plan_properties |= {prop["name"] for prop in plan.get("user_properties", [])}
        produced_events = set()
        produced_properties = set()
        if os.path.exists(ue_path):
            with open(ue_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    record = json.loads(line)
                    if record.get("#event_name"):
                        produced_events.add(record["#event_name"])
                    props = record.get("properties")
                    if isinstance(props, dict):
                        for key in props:
                            if key.startswith("#"):
                                continue
                            produced_properties.add(key)
        new_events.extend(sorted(produced_events - plan_events))
        new_properties.extend(sorted(produced_properties - plan_properties))
    if missing_plans:
        print("no plan.json in package for: " + ", ".join(missing_plans), file=sys.stderr)
        print("run the Tracking plan step first — the plan gate cannot be skipped", file=sys.stderr)
        sys.exit(3)
    if new_events:
        print("new events not in the plan: " + ", ".join(new_events), file=sys.stderr)
        sys.exit(3)
    if new_properties:
        print("new properties not in the plan: " + ", ".join(new_properties), file=sys.stderr)
        sys.exit(3)
    print("plan coverage ok")


if __name__ == "__main__":
    main()
`;
}

export function verifyPy(): string {
  return `#!/usr/bin/env python3
"""Persistence consistency check: submit-window counts vs the platform summary.

A soft check, not a hard gate. It computes what this run submitted from the local
UE output (knowable), snapshots \`ae-cli tracking ingest summary\` over the submit
window before and after upload, and prints both next to the expected counts. It
does NOT parse the summary payload into per-event numbers: the capability's data
shape is server-defined and not a stable CLI contract, and a shared project cannot
attribute the window delta to this import alone. For a hard per-event SQL judge,
overlay a project custom layer (see custom-layer.md in the ae-data-integration skill).

  verify.py <run-dir> --baseline    snapshot the summary before upload
  verify.py <run-dir> --check       snapshot again and diff against the baseline
"""
import json
import os
import subprocess
import sys


def pkg_root():
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def visit_window(record, lo, hi):
    raw = record.get("#time")
    if not isinstance(raw, str) or len(raw) < 19:
        return lo, hi
    stamp = raw[:19]  # YYYY-MM-DD HH:mm:ss
    if lo is None or stamp < lo:
        lo = stamp
    if hi is None or stamp > hi:
        hi = stamp
    return lo, hi


def main():
    if len(sys.argv) < 2:
        print("usage: verify.py <run-dir> [--baseline|--check]", file=sys.stderr)
        sys.exit(2)
    run_dir = sys.argv[1]
    mode = sys.argv[2] if len(sys.argv) > 2 else "--check"
    if mode not in ("--baseline", "--check"):
        print("usage: verify.py <run-dir> [--baseline|--check]", file=sys.stderr)
        sys.exit(2)
    root = pkg_root()
    pipeline = load_json(os.path.join(root, "pipeline.json"))
    project_id = pipeline["sink"]["params"].get("project_id") or os.environ.get("AE_PROJECT_ID") or "1"

    expected_events = {}
    expected_users = 0
    lo = hi = None
    for ref in pipeline["transform"]["refs"]:
        ue = os.path.join(root, run_dir, os.path.dirname(ref), "valid.ue.jsonl")
        if not os.path.exists(ue):
            continue
        with open(ue, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                record = json.loads(line)
                if record.get("#type") == "track" and record.get("#event_name"):
                    expected_events[record["#event_name"]] = expected_events.get(record["#event_name"], 0) + 1
                else:
                    expected_users += 1
                lo, hi = visit_window(record, lo, hi)

    if lo is None:
        print("verify: no UE records found in " + run_dir, file=sys.stderr)
        sys.exit(2)

    def run_summary():
        proc = subprocess.run(
            ["ae-cli", "tracking", "ingest", "summary",
             "-p", str(project_id), "--start-time", lo, "--end-time", hi],
            capture_output=True, text=True,
        )
        if proc.returncode != 0:
            return {"error": (proc.stderr or proc.stdout).strip()[:500]}
        try:
            return json.loads(proc.stdout)
        except json.JSONDecodeError:
            return {"raw": proc.stdout.strip()[:500]}

    print("window " + lo + " .. " + hi + "  project_id=" + str(project_id))
    print("expected (this run):")
    for event, count in sorted(expected_events.items()):
        print("  {:<20}{:>10,}".format(event, count))
    print("  {:<20}{:>10,}".format("<user rows>", expected_users))
    print()

    baseline_path = os.path.join(root, run_dir, "baseline.json")
    if mode == "--baseline":
        payload = run_summary()
        with open(baseline_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        print("baseline recorded: " + baseline_path)
        print("platform summary (before):")
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        sys.exit(0)

    if not os.path.exists(baseline_path):
        print("no baseline.json — run \`verify.py <run-dir> --baseline\` before upload.", file=sys.stderr)
        print("falling back to a single after-upload summary:", file=sys.stderr)
        print(json.dumps(run_summary(), ensure_ascii=False, indent=2))
        sys.exit(1)

    with open(baseline_path, "r", encoding="utf-8") as f:
        baseline = json.load(f)
    after = run_summary()
    print("platform summary before vs after:")
    print(json.dumps(baseline, ensure_ascii=False, indent=2))
    print("---")
    print(json.dumps(after, ensure_ascii=False, indent=2))
    print()
    print("summary changed: " + ("yes" if baseline != after else "no"))
    print()
    print("Boundary: the summary payload is server-defined and may under-report even")
    print("landed data; this check surfaces it for comparison, it does not auto-verify")
    print("per-event counts, and a shared project's window delta is not attributed to")
    print("this import. Cross-check with:")
    print("  ae-cli tracking live-data list -p " + str(project_id))
    print("For a hard SQL judge, add a project custom layer (custom-layer.md).")
    sys.exit(0)


if __name__ == "__main__":
    main()
`;
}

function resolveAppidPy(): string {
  return `#!/usr/bin/env python3
"""Derive the destination APPID from \`ae-cli project info get --project-id <id>\`.

\`project info get\` returns \`data.appid\` at the top level (verified against the
AE demo host), so this helper reads that exact field and prints it to stdout. It
prints nothing to stdout and reports the payload when the field is absent or not
a non-empty string — the caller then falls back to AE_APPID.

Usage: bin/resolve_appid.py <project-id>
"""
import json
import subprocess
import sys


def main():
    if len(sys.argv) != 2:
        print("usage: resolve_appid.py <project-id>", file=sys.stderr)
        sys.exit(2)
    project_id = sys.argv[1]
    proc = subprocess.run(
        ["ae-cli", "project", "info", "get", "--project-id", project_id],
        capture_output=True, text=True,
    )
    if proc.returncode != 0:
        print("resolve_appid: project info get failed: " + (proc.stderr or proc.stdout).strip()[:300], file=sys.stderr)
        sys.exit(0)
    try:
        parsed = json.loads(proc.stdout)
    except json.JSONDecodeError:
        print("resolve_appid: project info get returned non-JSON output", file=sys.stderr)
        sys.exit(0)
    data = parsed.get("data") if isinstance(parsed, dict) else None
    appid = data.get("appid") if isinstance(data, dict) else None
    if not isinstance(appid, str) or not appid:
        print("resolve_appid: project info get returned no appid; set AE_APPID", file=sys.stderr)
        print(json.dumps(data, ensure_ascii=False, indent=2) if data is not None else "{}", file=sys.stderr)
        sys.exit(0)
    masked = appid if len(appid) <= 4 else ("*" * (len(appid) - 4)) + appid[-4:]
    print("resolve_appid: resolved APPID data.appid = " + masked, file=sys.stderr)
    print(appid)


if __name__ == "__main__":
    main()
`;
}

export function generateReadme(): string {
  return `# AE Data Integration — handoff package

A frozen, reusable pipeline for importing a **same-shape** local file into AE,
generated by \`ae-cli data-integration handoff\`. Source and Transform are frozen
(the confirmed business logic); only the Tracking-plan and Sink gates still
require human confirmation.

## Quick start

\`\`\`bash
cp <today's file> inbox/
bin/run.sh                    # shape check -> convert -> plan check (no upload)
bin/upload.sh runs/<latest>   # dry-run
bin/upload.sh runs/<latest> --confirm
\`\`\`

Read [RUNBOOK.md](RUNBOOK.md) for the full flow, the four confirmation gates,
and how to verify persistence.

## Handing off to an agent

Import \`inbox/<today's file>\` through the ae-data-integration skill using this
package. Tell it to follow RUNBOOK.md and stop for confirmation before uploading.

## Package layout

| Path | Purpose |
| --- | --- |
| \`pipeline.json\` | Declarative source -> transform -> sink descriptor |
| \`index.json\` | Structure-fingerprint index (reuse matching) |
| \`shape.json\` | Column baseline used by the shape gate |
| \`<fingerprint16>/\` | Frozen mapping + tracking plan + transform wrapper |
| \`bin/run.sh\` | Source + Transform + Plan executor (never uploads) |
| \`bin/upload.sh\` | Sink executor (dry-run by default; resolves the recorded target) |
| \`bin/verify.py\` | Soft persistence check (submit window vs ingest summary) |
| \`bin/resolve_appid.py\` | APPID derivation helper (project info get) |
| \`.local/target.env\` | Upload target overrides (APPID / endpoint); only the template ships |
| \`inbox/\` \`runs/\` | Daily input / per-run outputs |

## Safety

The package records at most a destination \`pushurl\` and \`project_id\` (no APPID,
tokens, or raw data values). \`bin/upload.sh\` always requires \`--confirm\` before
sending, so the operator re-confirms the address and project on every reuse. Copy
\`.local/target.env.example\` to \`.local/target.env\` for explicit overrides and
never commit it.
`;
}

export function generateRunbook(): string {
  return `# RUNBOOK — same-shape file import

Run this when a file of the **same shape** arrives again (same sheets and
headers as \`shape.json\`). If the headers changed, stop: re-run the full
ae-data-integration pipeline instead of editing the frozen mapping.

## Gates

1. **Shape gate** — \`bin/run.sh\` rebinds the frozen mappings to the new file
   and compares the column set against \`shape.json\`. A mismatch fails fast on
   purpose: a different shape means the frozen business logic was never reviewed
   for it.
2. **Transform** — each frozen mapping runs through
   \`ae-cli data-integration convert\`. Quarantined rows land in
   \`invalid.rows.jsonl\`; they are never silently dropped.
3. **Tracking-plan gate** — \`bin/run.sh\` verifies every produced event and
   property already exists in the frozen \`plan.json\`. New events or properties
   make it exit with code 3: merge them into the project tracking plan first,
   then return here to upload.
4. **Sink gate** — \`bin/upload.sh\` is dry-run by default. Read
   \`record_count\`, \`batch_count\`, and \`manifest_status\` before adding
   \`--confirm\`. A \`blocked\` manifest means rows were quarantined;
   \`--confirm\` then uploads only the valid subset (\`--allow-clean-subset\`).

## Destination

The package records the destination it was handed off for when \`handoff\` was run
with \`--pushurl\` / \`--project-id\` (see \`pipeline.json\` → \`sink.params\`). Reuse
defaults to that target, but \`bin/upload.sh\` never sends without \`--confirm\`, so
the operator re-confirms the address and project every time.

Resolution order at upload time:

- endpoint: recorded \`pushurl\` (+ \`/sync_json\`), else \`AE_ENDPOINT\`.
- APPID: \`AE_APPID\`, else derived via \`ae-cli project info get --project-id <id>\`
  (see \`bin/resolve_appid.py\`; it reads the \`data.appid\` field — set \`AE_APPID\`
  when that field is absent).
- project id: recorded \`project_id\`, else \`AE_PROJECT_ID\`.

\`.local/target.env\` remains the explicit override for all three:
\`AE_ENDPOINT\` (full receiver URL ending in \`/sync_json\`), \`AE_APPID\`, \`AE_PROJECT_ID\`.

## Verify persistence

\`receiver_accepted\` is not persistence. About a minute after upload, confirm
the data landed with ae-cli. The package ships a soft check that automates the
before/after comparison:

\`\`\`bash
bin/verify.py runs/<run-id> --baseline   # before upload
bin/upload.sh runs/<run-id> --confirm
bin/verify.py runs/<run-id> --check      # after upload
\`\`\`

\`bin/verify.py\` prints the submit window and expected counts, then shows the
\`tracking ingest summary\` payload before and after for comparison. It does not
auto-verify per-event counts — the summary shape is server-defined, and a shared
project's window delta is not attributed to this import. Cross-check with:

\`\`\`bash
ae-cli tracking live-data list -p <AE_PROJECT_ID>
ae-cli tracking ingest-error list -p <AE_PROJECT_ID> --data-name <name>
\`\`\`

For a hard per-event SQL judge, overlay a project custom layer instead of editing
this package (see \`custom-layer.md\` in the ae-data-integration skill).

## Interrupted uploads

If a batch times out or loses the network, that batch's state is unknown. Stop:
verify what actually landed, then follow the ae-data-integration skill to resume
from the verified offset. Never re-run the whole upload blindly.

## Files

See \`README.md\` for the package layout.
`;
}

export function generateEnvTemplate(): string {
  return [
    '# Upload target overrides. Copy this file to .local/target.env and fill only',
    '# what the package does not already record (pipeline.json sink.params).',
    '# AE_ENDPOINT: a full receiver URL ending in /sync_json (used when no pushurl is recorded).',
    '# AE_APPID: the destination project APPID (overrides the project info get derivation).',
    '# AE_PROJECT_ID: the destination project ID, used when no project_id is recorded.',
    'AE_ENDPOINT=',
    'AE_APPID=',
    'AE_PROJECT_ID=',
    '',
  ].join('\n');
}

export function generateGitignore(): string {
  return ['inbox/', 'runs/', '.local/target.env', ''].join('\n');
}
