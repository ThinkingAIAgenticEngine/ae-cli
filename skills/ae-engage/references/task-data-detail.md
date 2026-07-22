# engage-task.task-data.detail

Query a task detail report through the L3 Capability Gateway.

Mapped command: `ae-cli capability run engage-task.task-data.detail --input '<json>'`

Required input: `project_id`, `task_id`, `detail_type`, `start_time`, `end_time`. `detail_type` is `time`, `instance`, or `instance_daily`; the last form also requires `task_instance_id`.

```bash
ae-cli capability run engage-task.task-data.detail --input '{"project_id":1,"task_id":"task_123","detail_type":"time","start_time":"2026-04-01","end_time":"2026-04-07"}'
```
