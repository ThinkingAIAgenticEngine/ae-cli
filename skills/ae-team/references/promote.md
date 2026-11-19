# team +promote

Only the personal owner with company Team management rights can convert the Team. The Team ID is preserved. Company members can use its saved configuration, and company administrators can manage it. Existing private automations, versions and runs stay private. Later config edits apply to new runs. Show the notification destinations in the preview. Company Teams cannot be converted back in place.

1. `ae-cli team +promote --id <team-id> --dry-run` reads the current server preview. Show the name and effect. Wait for explicit approval.
2. `ae-cli team +promote --id <team-id> --expected-revision <expectedRevision-from-preview>` submits that revision.
3. If the configuration changed, fetch a new preview and ask again. Report the returned Team ID and scope.
