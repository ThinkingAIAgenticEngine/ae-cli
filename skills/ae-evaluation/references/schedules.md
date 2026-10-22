# Scheduled evaluations

Commands use `ae-cli evaluation +<command>`. Read the shared endpoint, authentication, and mutation rules in [SKILL.md](../SKILL.md). Use command `--help` for optional flags.

### Schedules

```bash
ae-cli evaluation +list_schedules [--status PENDING|PROCESSING|COMPLETED|FAILED|CANCELLED] [--cursor <cursor>] [--limit 50]
ae-cli evaluation +create_schedule --run-id <run-uuid> --frequency HOURLY|DAILY|WEEKLY|MONTHLY --time-zone <iana> \
  [--minute-of-hour 0] [--hour-of-day 9] [--day-of-week 1] [--day-of-month 1]
ae-cli evaluation +update_schedule --id <schedule-uuid> --frequency <freq> --time-zone <iana> \
  [--minute-of-hour 0] [--hour-of-day 9] [--day-of-week 1] [--day-of-month 1] --lock-version <n>
ae-cli evaluation +delete_schedule --id <schedule-uuid> --lock-version <n>
```

HOURLY runs at minute 0 and must omit `--minute-of-hour` (or send 0). DAILY/WEEKLY/MONTHLY require `--minute-of-hour`. Schedules pin published task versions.

### Scheduled evaluations

```bash
ae-cli evaluation +list_schedules
ae-cli evaluation +create_schedule \
  --run-id <run-uuid> \
  --frequency DAILY \
  --time-zone Asia/Shanghai \
  --hour-of-day 9 \
  --minute-of-hour 0
ae-cli evaluation +update_schedule --id <schedule-uuid> --frequency WEEKLY --time-zone Asia/Shanghai \
  --day-of-week 1 --hour-of-day 9 --minute-of-hour 0 --lock-version <n>
ae-cli evaluation +delete_schedule --id <schedule-uuid> --lock-version <n>
```
