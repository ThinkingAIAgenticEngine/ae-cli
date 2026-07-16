# engage-task push-record query

Query delivery and push records for an engagement task. Hermes automatically selects scheduled, user-time-zone, or triggered record data based on the task configuration.

> Capability id: `engage-task.push-record.query` · Domain: `engage`.

```bash
ae-cli engage-task push-record query \
  --project-id <project-id> \
  --task-id <task-id> \
  --page-num 1 \
  --page-size 20
```

## Parameters

- `--project-id`, `-p`: Numeric project ID.
- `--task-id`: Engagement task ID.
- `--page-num`: Optional page number for scheduled tasks. Defaults to `1`.
- `--page-size`: Optional page size for scheduled tasks. Defaults to `20`.
- `--start-date`: Optional start date in `yyyy-MM-dd` format. Must not be after `--end-date`.
- `--end-date`: Optional end date in `yyyy-MM-dd` format. Must not be before `--start-date`.

## Output

Returns `record_type`, `items`, `total`, and pagination metadata when the selected backend record type is paginated. Records include available trigger, planned-send, actual-send, success, channel-exception, status, and failure-reason fields.
