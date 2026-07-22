# engage-scene.report.config-item-analysis

Query config item analysis results through the L3 Capability Gateway.

Mapped command: `ae-cli capability run engage-scene.report.config-item-analysis --input '<json>'`

Required input: `project_id`, `config_id`, `start_time`, `end_time`. Optional input: `request_id`,
`template_id_list`, `strategy_id_list`, `show_time_zone`. `template_id_list` and `strategy_id_list`
are mutually exclusive.

```bash
ae-cli capability run engage-scene.report.config-item-analysis \
  --input '{"project_id":1,"config_id":"cfg_123","start_time":"2026-04-01","end_time":"2026-04-07"}'
```
