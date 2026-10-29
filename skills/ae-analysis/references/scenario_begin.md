# analysis scenario begin

Command: `ae-cli analysis scenario begin`. Risk: `read`. Local clock utility; no Gateway capability or network request.

## Input

No command-specific flags. Run once when starting this question, before analysis calls. Retain the exact returned `data.start_time` and pass it as `--start-time` to [collect](scenario_collect.md) when the answer is ready, or [append](scenario_append.md) for a new revised answer. No local file or question content is written. Do not call this for historical review or regenerate a missing earlier timestamp.

## Output

`data.start_time` is a timezone-qualified ISO-8601 timestamp. The collection command computes one duration_ms. It measures this marker to the prepared-answer collection, not unobserved time before the marker or confirmed UI delivery. Missing timing stays unknown. Start a fresh clock for each follow-up answer so user waiting time is excluded.
