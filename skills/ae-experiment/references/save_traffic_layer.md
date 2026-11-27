# experiment traffic-layer save

Create or update a traffic layer.

```bash
ae-cli experiment traffic-layer save --project-id <id> --req '<json>'
```

Flags:
- `--project-id`, `-p`: Project ID.
- `--req`: Traffic layer save request JSON object.

Create mode requires `bucketId`, `layerName`, and `layerType` in the request. `layerType`
must be `remote` or `local`; local routing does not support `bucketId="#user_id"`.
Modify mode requires `layerId`.

```bash
ae-cli experiment traffic-layer save --project-id 1 --req '{"layerName":"Local account layer","layerType":"local","bucketId":"#account_id"}' --dry-run
```


## Traffic domain membership

Optional `req.domainId` binds the layer to a root traffic domain in the same project and
bucket subject. For an existing layer, omit/null to retain membership or pass an empty
string to clear it. A membership-only patch is supported. Related experiments must all
be draft, ended, or archive before changing membership. Layer ID and salt remain stable.
List/get return nullable `domain_id` and `domain_name`. Read
[`manage_traffic_domains.md`](manage_traffic_domains.md) for versioned quota management.
