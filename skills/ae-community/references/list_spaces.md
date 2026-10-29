# ae-community spaces list

List the community spaces available to the authenticated user. Run this before curated community
analysis when the real `spaceId` is unknown.

Mapping command: `ae-cli community spaces list`

Capability: `community.space.list`

## Flags

No command-specific flags are required. Authentication and host selection use the standard ae-cli
configuration and global flags.

## Example

```bash
ae-cli community spaces list
```

Use the returned `spaceId` as `--space-id` for `+get_channel_info` and the other curated commands.
IDs outside JavaScript's safe integer range are emitted as strings in JSON. Copy all digits exactly
and never convert an ID to a floating-point number.

## Returned count and failures

A successful array response includes `meta.returned_count`, calculated by the CLI from the number
of entries in `data`. Use it when reporting how many entries this call returned; verify that the
number matches the rows you display. It is not a global total or a count of unique space IDs.
If the server also supplies `returned_count`, the CLI's array count takes precedence. Other server
metadata, including `total` when present, is preserved with its original meaning.

The count describes the original response before any `--jq` projection or filtering. If you filter
the displayed rows locally, state the displayed count separately rather than presenting
`meta.returned_count` as the filtered count.

`ok: true`, `data: []`, and `meta.returned_count: 0` mean this successful call returned no visible
spaces. Authentication, permission, routing, and capability failures remain failures; never turn
them into an empty successful list or infer zero available spaces from an error.
