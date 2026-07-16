# Shared audience definition primitives

This file contains only the primitives shared by user-cluster and user-tag semantic definitions. Read the domain-specific contract before constructing JSON:

- [`user_cluster_models.md`](user_cluster_models.md) for cluster condition/SQL definitions.
- [`user_tag_models.md`](user_tag_models.md) for tag condition/metric/first-last/SQL definitions.

Use semantic snake_case only. Never send compiler or UI fields such as `filts`, `conditionType`, `eventName`, `uceCalcuSymbol`, `C030`, `columnName`, `ftv`, `tagValue`, or `taSqlVo`.

## Operators

`eq`, `neq`, `lt`, `lte`, `gt`, `gte`, `exists`, `not_exists`, `between`, `contains`, `not_contains`, `is_true`, `is_false`, `regex`, `not_regex`, `in_cluster`, `not_in_cluster`.

## Property reference

A property is either a name or a typed object:

```json
"country"
```

```json
{"name":"country","type":"user_property"}
```

## Time range

```json
{"mode":"recent","unit":"day","value":7}
{"mode":"previous","unit":"day","value":30}
{"mode":"custom","start_time":"2026-07-01","end_time":"2026-07-07"}
```

## Filter group

Groups use `{relation,items}`. Each item has `field`, `operator`, and optional `values`:

```json
{"relation":"and","items":[{"field":"country","operator":"eq","values":["US"]}]}
```

Pass a semantic object directly to `--definition-request`. Create/update validate and compile it in the same operation. Use `--validate` for schema validation or `--dry-run` for a no-write execution preview; there is no separate public definition build command.
