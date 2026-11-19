# team +copy-to-personal

A member who can read a company Team can make a personal copy. A new Team ID belongs to that member. The source Team, its automations and history are unchanged. The copy contains the current workflow without automation schedules, history or notification destinations.

1. `ae-cli team +copy-to-personal --id <team-id> --dry-run` reads the current server preview. Show the name and effect. Wait for explicit approval.
2. `ae-cli team +copy-to-personal --id <team-id> --expected-revision <expectedRevision-from-preview>` submits that revision.
3. If the configuration changed, fetch a new preview and ask again. Report the returned Team ID and scope.
