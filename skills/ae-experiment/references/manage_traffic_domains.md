# Manage traffic domains

Use `ae-cli experiment traffic-domain list|create|update|delete` to manage root domains.
These commands use the engage Capability Gateway with CLI token authentication:
`experiment.traffic_domain.list|create|update|delete`. They require the matching Hermes
capabilities to be deployed; a local CLI upgrade alone does not add server support.

## Discover and interpret the current state

```bash
ae-cli experiment bucket list --project-id 1
ae-cli experiment traffic-domain list --project-id 1 --bucket-id '#account_id'
```

Omit `--bucket-id` to list all configured subjects. Supported subjects are `#user_id`,
`#account_id`, `#distinct_id`, and `#device_id`. Each returned `data.items[]` is a Space:
`space_id` equals `bucket_id`, `allocation_version` is the quota concurrency token, and
`domains[]` contains `domain_id`, `domain_name`, `domain_desc`, `allocation_bps`,
`bucket_start`, `bucket_end`, `can_edit_metadata`, `can_adjust_allocation`,
`has_experiments`, and `can_delete`. `data.total` counts Spaces, not domains.
An empty list means there are no domains matching this query; it does not create a Space.

One Space is scoped to the project and bucket subject. Domains split its 10000 buckets
into mutually exclusive ranges. Layers within a domain split traffic independently.
Quotas are integers from 1 to 10000 basis points: 3000 means 30%, not 3000%.
Total quotas may be less than 10000; the remaining traffic is unallocated.
Domain basis points differ from the integer percentages used by experiment/group allocation.
Do not pass RCC publication versions as `--expected-version`.

## Create and edit quotas

First domain for a subject (no existing Space):

```bash
ae-cli experiment traffic-domain create --project-id 1 --bucket-id '#account_id' \
  --name 'Checkout' --description 'Checkout experiments' \
  --allocation-bps 3000 --expected-version 0 --dry-run
```

Creating another domain requires **all existing domains** in `--allocations` and the
Space version returned by list. The following assumes list returned `d1` and version 1:

```bash
ae-cli experiment traffic-domain create --project-id 1 --bucket-id '#account_id' \
  --name 'Acquisition' --allocation-bps 2000 --expected-version 1 \
  --allocations '[{"domain_id":"d1","allocation_bps":3000}]' --dry-run
```

Metadata update requires the current or new name. Omitted `--description` clears the
saved description; pass the existing description to preserve it. No version is required
for metadata-only changes, and they do not increment the quota version.

```bash
ae-cli experiment traffic-domain update --project-id 1 --domain-id d1 \
  --name 'Checkout' --description 'Revised description' --dry-run
```

For a quota update, supply `--allocation-bps`, `--expected-version`, and `--allocations`
together. The allocation array must contain every **other** domain of the same subject,
without duplicates or the domain being updated. Pass `[]` when there are no other domains.
For example, after list confirms version 2 and the two IDs:

```bash
ae-cli experiment traffic-domain update --project-id 1 --domain-id d1 \
  --name 'Checkout' --allocation-bps 4000 --expected-version 2 \
  --allocations '[{"domain_id":"d2","allocation_bps":2000}]' --dry-run
```

The subject is immutable. `--bucket-id` on update is optional and must match the saved
subject. The backend checks completeness, ownership, current experiment states and
contiguous bucket availability under its transaction locks. `testing`, `pending`,
`running`, `paused`, and unknown experiment states protect domain quota and bucket ranges.
Domains with only `draft`, `ended`, or `archive` experiments may be adjusted with permission.
An unchanged protected domain can remain in the complete allocation array while another
domain uses remaining capacity. A Space-level `can_adjust_allocation=false` does not
by itself prohibit creating a domain from unallocated traffic.

`--validate` and `--dry-run` are mutually exclusive, non-writing contract checks; they do
not reserve versions or guarantee that execution will pass current business checks.
After review, execute by omitting `--dry-run`. After a successful quota write, list again.
On `TRAFFIC_DOMAIN_VERSION_CONFLICT`, re-list, compare the changed quotas with the user's
intent, and rebuild the request. Do not silently replace the version or retry the write.
For locked quotas, permission failures or fragmented capacity, report the reason without
changing experiment states or other domains automatically.

## Bind layers and exclusive experiment drafts

Use existing `traffic-layer save --req` and `experiment save --req` commands. Their nested
DTO fields remain camelCase; use `domainId`, not `domain_id`, inside `--req`.

```bash
ae-cli experiment traffic-layer save --project-id 1 \
  --req '{"layerName":"Checkout layer","layerType":"remote","bucketId":"#account_id","domainId":"d1"}' --dry-run
ae-cli experiment traffic-layer save --project-id 1 \
  --req '{"layerId":"layer1","domainId":"d1"}' --dry-run
ae-cli experiment experiment save --project-id 1 \
  --req '{"expName":"Checkout draft","isExpSharing":0,"bucketId":"#account_id","layerType":"remote","domainId":"d1"}' --dry-run
```

Domain and resource must belong to the same project and bucket subject. Layer-only
patches can bind or clear (`domainId:""`) membership when all related experiments are
`draft`, `ended`, or `archive`; omitted/null `domainId` retains existing membership.
Changing a layer's domain preserves its ID and salt. Exclusive experiment drafts may
select/change/clear their domain; shared experiments use their selected layer's domain
and ignore the exclusive `domainId` input. Changing an exclusive draft's domain may
recreate its private layer while preserving experiment ID, salt and group identities.
Layer and experiment list/get results expose nullable `domain_id` and `domain_name`;
historical unbound layers remain unbound. Legacy CLI layer creation without `domainId`
remains supported. Prefer explicit domain selection for new domain-based traffic.
Remote routing applies domain isolation after the Hermes/RCC upgrade; complete SDK local
Space/Domain evaluation is a later stage. Do not promise local domain isolation from
`layerType:"local"` alone.

## Delete a domain

Read current state, verify `can_delete`, and confirm the target domain with the user.
Preview using the latest Space version:

```bash
ae-cli experiment traffic-domain delete --project-id 1 --domain-id d1 \
  --expected-version 3 --dry-run
```

Only after user confirmation, remove `--dry-run` and add `--yes` for non-interactive use.
Deletion is `high-risk-write`. It soft-deletes the domain and unbinds every linked layer,
including historical layers, while retaining layers and experiments, layer IDs, salts,
and subjects. It requires resource permission on the domain and all linked layers;
active or unknown experiment states block deletion. Released quota becomes unallocated;
other domains' quotas and ranges remain unchanged, and their quota version increments.
Deleting the final domain returns `data.items: []`. Creation after the final deletion
uses version 0 from the now-empty quota API state, not an RCC publication revision.
