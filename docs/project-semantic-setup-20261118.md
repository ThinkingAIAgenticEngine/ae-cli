# Project business-semantics setup

`project-semantic setup` is a read-only L1 composition. It adds task-level value beyond a capability alias: existing company/project background and draft reads, complete scoped catalogs, local material inventory, reuse of the existing asset export lifecycle/materializer, and a private evidence manifest. The calling Agent follows `skills/ae-analysis/references/project_semantic_setup.md` to read, synthesize, review and save approved content through existing capabilities. Preparation is not generation or publication.

## Observable contract

- Default `certified`: valid certified roots, including unused assets, plus dependencies.
- `frequent`: dashboards/reports with positive actual 90-day query counts, ranked, plus dependencies. Frequency is not authority.
- `all`: valid project assets; `specified`: exact typed references, with missing roots rejected; `none`: retained local materials required.
- New asset scopes require the existing semantic-manager authorization and the new Common deployment. Legacy asset export scopes and the `governed` default remain unchanged.
- Read company background, project background/draft, global personal, project personal and public catalogs. Global personal uses its existing global capability route. Complete catalogs must match their total and contain valid, unique identities.
- No semantic save, publication or use-counter mutation during preparation. Failed evidence cannot be reported ready. Local files remain private; an existing directory is never overwritten.
- Save proposals contain four project entry categories and a separate background draft. Sources, distinctions, dependencies, conflicts and CREATE/UPDATE/KEEP decisions must be reviewable. Confirmed saves use a local per-item plan and stable retry IDs; publication is separate.
- Save source filenames by default (`sources:[{"name":"business-overview.docx"}]`) for both entries and backgrounds. Paths, detailed locators, checksums and raw asset JSON remain in the private local review plan; assets use `resource_refs`. Actual original documents can still be retained with `input_file_id`, and authorized evidence can be reused with `evidence_id`.
- Deployment order for filename-only saves: Common first, then the CLI and bundled `ae-analysis` Skill. The earlier Common required `excerpt` and rejects filename-only writes. The new Common still accepts explicit existing excerpt descriptors and retains historical evidence unchanged; no database migration or automatic cleanup is needed. A CLI/Skill rollback can continue using the updated Common.
- Recovery retains completed evidence and structured async IDs where available. The Skill explains manual continuation and deliberate replacement snapshots. There is no automatic server import-task or automatic resume command.

## Local validation

`tsx --test tests/project-semantic-setup-command.test.ts` covers read order, private file modes, no writes/counting, exporter reuse, manager denial, partial catalogs, exact references, failure manifests and async IDs. `tsx tests/project-semantic-asset-package-command.test.ts` covers the existing default plus new scope/ref forwarding. Run `npm test`, `npm run check:release`, `npm run verify:analysis-skill`, `npm run verify:personal-semantic`, `tsc --noEmit` and `npm run build` before delivery.

An independent Agent tested this checkout's source CLI and bundled Skill with strict local gateway fixtures, all five scope choices and an illustrative game-project proposal. These checks do not establish deployed Common selection correctness or online writes; perform live acceptance after Common and frontend deployment and distribution of the matching CLI/Skill.
