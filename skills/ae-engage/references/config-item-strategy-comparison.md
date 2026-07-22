# engage-scene.report.strategy-comparison

Compare config strategy results through the L3 Capability Gateway.

Mapped command: `ae-cli capability run engage-scene.report.strategy-comparison --input '<json>'`

Required input: `project_id`, `config_id`, `strategy_id_list` with at least two IDs. Optional input:
`request_id`, `show_time_zone`.

```bash
ae-cli capability run engage-scene.report.strategy-comparison \
  --input '{"project_id":1,"config_id":"cfg_123","strategy_id_list":["strategy_a","strategy_b"]}'
```
