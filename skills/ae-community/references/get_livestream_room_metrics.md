# ae-community +get_livestream_room_metrics


Core metrics and annual calendar for a single livestream room: Overview KPIs plus daily livestream duration calendar.

Mapping command: `ae-cli community +get_livestream_room_metrics`

## Flags

| Flag | Type | Required | Description |
|------|------|------|------|
| `--space-id` | int64 | yes | Community space ID returned by `community spaces list` |
| `--game-id` | int64 | no | Deprecated compatibility alias; omit it, or make it equal to `--space-id` |
| `--channel-id` | number | Yes | Channel ID (obtain via `get_livestream_rooms`) |
| `--room-id` | string | yes | Room ID (obtain via `get_livestream_rooms`) |
| `--year` | string | No | Year, format yyyy, default is the current year |

## Example

```bash
# Get the annual indicators of the livestream room
ae-cli community +get_livestream_room_metrics \
  --space-id 1 \
  --channel-id 1 --room-id <room-id> --year 2024
```
