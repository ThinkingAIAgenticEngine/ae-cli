---
name: dataops-flow-python
version: 1.0.0
description: "Python workflow task nodes: discover Python versions, pip package sources, and DEV/PROD mount directories, browse DEV files, and create, read, or partially update single-file Python nodes with TE_OUTPUT parameters. Trigger keywords: Python task, python node, requirements.txt, TE_OUTPUT, python version, package source, python directory."
metadata:
  requires:
    bins: ["ae-cli"]
---

# DataOps Python Workflow Nodes

> **Prerequisites:** Read [`ae-dataops/SKILL.md`](../SKILL.md) for general rules. Use [flow configuration](dataops-flow-create.md) to create flows, wire DAG dependencies, configure schedules, and preview/release to PROD. Use [execution and monitoring](dataops-flow-monitor.md) for PROD runs and task log troubleshooting.

## Permissions and DEV/PROD Boundaries

- **Permission (`dwWorkflowEdit`)**: All 7 Python commands—including the 4 read-only discovery commands—require workflow edit permission (`dwWorkflowEdit`) in `spaceCode`. Missing space membership or `dwWorkflowEdit` returns `error.type="permission"` (`code: "-10"`); re-login will not resolve it.
- **No remote DEV single-node debug-run CLI**: Debug `./main.py` and `./requirements.txt` locally before upload. When remote execution is explicitly requested, preview and release the flow to PROD via [the release workflow](dataops-flow-create.md#step-8-preview-release), then run `dataops_flow +execute_flow`.
- **DEV vs PROD visibility**: `+get_python_task` and `+browse_python_directory` inspect **DEV** only. To inspect the executed historical script, dependencies, runtime inputs/outputs, and logs of a **PROD** run, use `dataops_operations +get_task_instance_detail --includeLog true` (`definition.task.pythonTask`, `runtimeParams`, and `log.taskLog`).

---

## Step 1: Discover Environment and Mounted Directories (read-only)

```bash
# Discover supported Python versions (defaultVersion is first, e.g. 3.11)
ae-cli dataops_flow +list_python_versions --spaceCode "${spaceCode}"

# Discover enabled cluster pip package sources and defaultSourceKey
ae-cli dataops_flow +list_python_package_sources --spaceCode "${spaceCode}"

# List authorized container mount roots (shared DEV/PROD path contract)
ae-cli dataops_flow +list_python_directories --spaceCode "${spaceCode}"

# Bounded browse of physical files in DEV storage (skips virtual parent folders by default)
ae-cli dataops_flow +browse_python_directory --spaceCode "${spaceCode}" \
  --maxDepth 2 --maxEntries 200
```

- `+list_python_directories` returns authorized mount root metadata (`/dw/<space>/product` `rw`, `/dw/<space>/exchange` `rw`, incoming `/dw/<owner>/exchange` `ro`) shared across DEV and PROD without hitting storage.
- `+browse_python_directory` reads **DEV physical files only** (`maxDepth` `1..3` default `2`, `maxEntries` `1..500` default `200`; inspect `truncated` and `hasDeeperDirectories`). When `--path` is omitted, returning `entries: []` with non-empty `roots` means the authorized DEV directories are currently empty (not unmounted). Files written during PROD runs live in PROD storage and do not appear in DEV directory browsing.

---

## Step 2: Author, Upload, Read, and Update Python Nodes

### Runtime and Contract Rules

- **Single-file contract (`main.py` only)**: The platform stores one `scriptContent` text and executes it as a single `main.py` in an isolated K8s Pod (`uid=10001`). **Never split custom helper `.py` modules for local `import`**; keep all custom functions/classes in one `.py` file.
- **Upload from local files**: Prefer `--scriptFile` and `--requirementsFile` over inline strings to avoid shell-quoting or `${paramKey}` expansion bugs. Remember `${paramKey}` is substituted as literal text before container execution, and `/dw/<spaceCode>/...` mount paths exist inside the container rather than on your local host.
- **Size and dependency rules**: Combined `scriptContent` + `requirementsTxt` must not exceed **524,288 UTF-8 bytes (512 KiB)**. `requirements.txt` supports PyPA package specifiers (version constraints, extras, `#` comments, quoted markers such as `six==1.16.0 ; python_version >= "3.11"`), and **rejects** `-i`/`--index-url`, URLs, VCS links, editable installs, and local archive paths. Packages install with `--user` into the non-root container; write temporary runtime files only to `/tmp` or `rw` `/dw/<spaceCode>/...` directories.
- **Output parameters (`TE_OUTPUT:` strict protocol)**: Print **one `TE_OUTPUT:` line per parameter** as compact JSON with exact keys `{"name":"<paramKey>","value":<jsonValue>}` (for example `TE_OUTPUT:{"name":"out_dt","value":"2026-11-21"}`), using `flush=True` and no timestamp or log-level prefix before `TE_OUTPUT:`. **Never emit a multi-key map** such as `{"out_a":1,"out_b":2}`—a malformed `TE_OUTPUT:` protocol line fails the entire Python task (`FAIL`). **Only names pre-declared in `--outputParams` are published** as `VARCHAR` (`paramKey` must match `^[a-z][a-z0-9_]{0,39}$`, cannot be `env`, and cannot start with `ws_`); undeclared names are ignored. Downstream nodes wired via `--preTasks` consume published outputs as `${paramKey}`.

```bash
# Create a DEV Python task from local debugged files with an OUT parameter
ae-cli dataops_flow +create_python_task --spaceCode "${spaceCode}" \
  --flowCode ${flowCode} --taskName "Score Daily Users" \
  --scriptFile ./main.py --requirementsFile ./requirements.txt \
  --outputParams '[{"paramKey":"out_dt","remark":"Processed business date"}]'

# Read the current DEV Python task definition before incremental edits
ae-cli dataops_flow +get_python_task --spaceCode "${spaceCode}" \
  --flowCode ${flowCode} --taskCode ${taskCode}

# Partial update: replace only requirements, keep existing script/version/packageSource/OUT params
ae-cli dataops_flow +update_python_task --spaceCode "${spaceCode}" \
  --flowCode ${flowCode} --taskCode ${taskCode} \
  --requirementsFile ./requirements.txt

# Clear all pip requirements and OUT declarations explicitly
ae-cli dataops_flow +update_python_task --spaceCode "${spaceCode}" \
  --flowCode ${flowCode} --taskCode ${taskCode} \
  --requirements "" --outputParams '[]'
```

### Defaults and Three-State Update Semantics

- `+create_python_task` requires `--spaceCode`, `--flowCode`, `--taskName`, and exactly one of `--scriptFile` or `--script`. Defaults: `--pythonVersion` = first configured version (`3.11`), `--packageSourceId` = cluster default source, retry policy = `3` times / `5` / `MINUTE`.
- `+update_python_task` requires `--spaceCode`, `--flowCode`, `--taskCode`, and at least one update field. Omitted fields keep existing DEV values; `--requirements ""` (or an empty `--requirementsFile`) clears pip dependencies; `--remark ""` clears remark.
- `--outputParams` (`[{"paramKey":"out_dt","remark":"..."}]`) and `--preTasks` (JSON array of upstream task codes) use three-state semantics on update: omit to keep, pass `'[]'` to clear, or pass a non-empty array to replace.

---

## Command Quick Reference

| Command | Purpose | Risk | Key Flags |
|---------|---------|------|-----------|
| `ae-cli dataops_flow +create_python_task` | Create DEV single-file Python task | write | `--spaceCode` `--flowCode` `--taskName` (`--scriptFile` or `--script`) `[--requirementsFile\|--requirements]` `[--pythonVersion]` `[--packageSourceId]` `[--outputParams]` `[--preTasks]` `[retry flags]` `[--remark]` |
| `ae-cli dataops_flow +update_python_task` | Partially update DEV Python task | write | `--spaceCode` `--flowCode` `--taskCode` `[--scriptFile\|--script]` `[--requirementsFile\|--requirements]` `[--pythonVersion]` `[--packageSourceId]` `[--outputParams]` `[--preTasks]` `[retry flags]` `[--remark]` |
| `ae-cli dataops_flow +get_python_task` | Read DEV Python task definition | read | `--spaceCode` `--flowCode` `--taskCode` |
| `ae-cli dataops_flow +list_python_versions` | List supported Python versions | read | `--spaceCode` |
| `ae-cli dataops_flow +list_python_package_sources` | List cluster-enabled pip package sources | read | `--spaceCode` |
| `ae-cli dataops_flow +list_python_directories` | List authorized container mount roots (`ro`/`rw`) | read | `--spaceCode` |
| `ae-cli dataops_flow +browse_python_directory` | Bounded browse of DEV Python workspace files | read | `--spaceCode` `[--path]` `[--maxDepth]` `[--maxEntries]` |

## Transport Status

Transition status: transitional

Owning module: gaia-mcp workflow

Current transport: DataOps CLI REST

Covered workflow tools: `flow_create_python_task`, `flow_update_python_task`, `flow_get_python_task`, `flow_list_python_versions`, `flow_list_python_package_sources`, `flow_list_python_directories`, and `flow_browse_python_directory`

Gateway target: TBD after DataOps workflow Gateway schema review

Review after: 2026-12-21

Exit condition: Migrate or remove these one-to-one commands after equivalent Capability Gateway actions are available.
