# engage-task.task-data.metric-detail

Query a task metric detail report through the L3 Capability Gateway.

Mapped command: `ae-cli capability run engage-task.task-data.metric-detail --input '<json>'`

Required input: `project_id`, `task_id`, `start_time`, `end_time`. Optional input includes `request_id`, `push_language_code`, `metric_id_list`, `group_type`, and `show_time_zone`.

```bash
ae-cli capability run engage-task.task-data.metric-detail --input '{"project_id":1,"task_id":"task_123","start_time":"2026-04-01","end_time":"2026-04-07"}'
```
