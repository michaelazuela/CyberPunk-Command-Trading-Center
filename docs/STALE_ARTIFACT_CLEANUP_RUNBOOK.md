# Stale Artifact Cleanup Runbook

This workflow inventories generated scanner artifacts without treating old files as current scanner proof.

Authority boundary:

- Does not post Discord.
- Does not write Supabase.
- Does not change scanner state.
- Does not change trading logic, `canExecute`, entry, stop, target, risk, ranking, setup definitions, or 5M bar-close handling.
- Defaults to dry-run.

## What It Scans

The cleanup inventory classifies files under generated artifact locations such as:

- `tools/automation/discord-audit`
- `tools/automation/chart-markups`
- `tools/automation/diagnostic-reports`
- `tools/automation/live-desk-observer-reports`
- `tools/automation/replay-diagnostics`
- `logs/supervisor`
- local runtime state files such as `tools/automation/.nt-scanner-state.json.bak`

It protects:

- source code
- tests and regression fixtures
- docs
- Supabase migrations
- RAG/research records
- canonical fixtures, including the Discord/chart drift regression fixture

## Dry-Run Inventory

Run:

```bash
npx tsx tools/automation/stale-artifact-cleanup.ts --json-out tools/automation/diagnostic-reports/stale-artifact-cleanup-dry-run.json --json
```

The report includes one row per inspected file:

- file path
- classification
- reason
- last modified time
- size
- matched rule
- action dry-run would take

Classifications:

- `keep_canonical`
- `keep_regression_fixture`
- `keep_research_or_rag`
- `archive_legacy_generated`
- `delete_temp_backup`
- `review_required`

## Review Criteria

Only proceed to apply when the dry-run report proves:

- archive candidates are generated artifacts, not source/test/docs/research/RAG records
- delete candidates are only temp/backup generated artifacts
- current-format or unclear runtime files are `review_required`
- canonical and regression files are protected

## Apply With Quarantine

Prefer archive/quarantine over deletion:

```bash
npx tsx tools/automation/stale-artifact-cleanup.ts --apply --archive-dir tools/automation/stale-artifact-archive --json-out tools/automation/diagnostic-reports/stale-artifact-cleanup-apply.json --json
```

Archive behavior:

- preserves relative paths
- refuses to overwrite existing archive files
- writes an archive manifest

Delete behavior:

- deletes only per-file classified temp/backup artifacts
- never recursively deletes broad directories

## Restore

Use the archive manifest to copy or move a file back to its original relative path. Do not restore archived artifacts into active proof paths unless the operator intentionally wants to inspect old history.

## Proof Signoff Rule

Current scanner proof and Discord card signoff must not use:

- files under `stale-artifact-archive`
- paths containing `/archive/` or `/archived/`
- `.legacy.*` files
- `.bak` files
- `.tmp` files

Old tapes may be useful historical evidence, but they are not clean current-format signoff proof.

## Verification

Run:

```bash
npx tsx tools/automation/stale-artifact-cleanup.test.ts
npx tsx tools/automation/live-observation-proof-audit.test.ts
npx tsx tools/supervisor/discordCardArtifactSignoff.test.ts
npm run guard:no-firebase
npm run guard:architecture
npm run guard:schema
npm run lint
npm run build
npm run test
```
