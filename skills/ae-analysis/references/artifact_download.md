# analysis artifact download

Use after `run inspect` shows an export artifact is complete.

Do not use before the run reaches a successful terminal status. Use `run inspect` first.

Command:

```bash
ae-cli analysis artifact download --run-id <run_id> --artifact-id <artifact_id> --output <file>
```

Input sends `run_id`, `artifact_id`, and local `output` path.

Output is the gateway download result written to the local `--output` path. The command returns JSON with `run_id`, `artifact_id`, `output_path`, `bytes`, and response content headers.

Do not paste large artifact content into chat. Inspect the local file or summarize only the needed rows.
