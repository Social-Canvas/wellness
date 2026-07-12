# Reset Media Migration Runbook

Course slug: `7-day-reset-meditation-series`  
Scope: real media migration for 22 lessons only (Welcome + Day 1-7 morning/afternoon/evening)

## Safety principles

1. Use existing `videos` rows only; never create duplicate video rows.
2. Sources must be explicit in manifest (`localPath` or `driveUrl`) and never guessed by scripts.
3. Welcome stand-in playback ID `cevtQPbDchk4Foe666xyBV2KUyp7xbQSPhtFCMc7Kv4` is a hard launch blocker.
4. Do not auto-publish course/module/lesson from scripts.
5. Keep old Welcome stand-in asset undeleted until replacement succeeds and playback verification passes.

## Files involved

- Manifest template: `scripts/reset-media-manifest.example.json`
- Migration script: `scripts/reset-media-migrate.mjs`
- Ops script: `scripts/reset-media-ops.mjs`
- Inventory CSV: `docs/7-day-elevated-reset-media-inventory.csv`
- Inventory reference: `docs/7-day-elevated-reset-media-inventory.md`

## 1) Prepare manifest

Copy template and fill all 22 keys:

```bash
cp scripts/reset-media-manifest.example.json scripts/reset-media-manifest.json
```

For every lesson key:

- provide exactly one source:
  - `localPath` (local file path), or
  - `driveUrl` (explicit download URL provided by user)
- keep `videoTitle` aligned to canonical title
- do not leave `"TBD"` when ready to migrate

## 2) Preflight checks

```bash
node scripts/reset-media-ops.mjs validate-inventory
node scripts/reset-media-ops.mjs missing-files --manifest scripts/reset-media-manifest.json
node scripts/reset-media-ops.mjs status --env-file .env.local
node scripts/reset-media-ops.mjs blockers --env-file .env.local --manifest scripts/reset-media-manifest.json
```

If blockers report non-zero blockers, resolve before upload.

## 3) Run migration

Dry-run first:

```bash
node scripts/reset-media-migrate.mjs --manifest scripts/reset-media-manifest.json --env-file .env.local --dry-run
```

Real upload/sync:

```bash
node scripts/reset-media-migrate.mjs --manifest scripts/reset-media-manifest.json --env-file .env.local
```

Optional single-lesson retry:

```bash
node scripts/reset-media-migrate.mjs --manifest scripts/reset-media-manifest.json --env-file .env.local --lesson-key day3_evening
```

Script writes sidecar status JSON at:

- `docs/7-day-elevated-reset-media-migration-status.json` (default)

## 4) Welcome replacement workflow (safe)

1. Put real Welcome source in manifest key `welcome` (local file or explicit URL).
2. Run migrate script for `--lesson-key welcome`.
3. Confirm `status` command no longer shows stand-in playback ID.
4. Manually verify member playback and progress for Welcome.
5. Only after successful verification, manually archive/delete old stand-in asset if desired.

## 5) Publish readiness rules (manual)

Use reports; do not auto-publish:

- video can publish only when `mux_playback_id` exists and status is `ready` or `published`
- lesson can publish only when linked video is ready
- module can publish only when intended lessons are ready
- course remains draft until all required media are verified
- never expose empty lessons

Run:

```bash
node scripts/reset-media-ops.mjs safe-to-publish --env-file .env.local
```

## 6) Verification pass

1. Signed playback works for each ready lesson.
2. Progress save/resume still works (`video_progress` updates).
3. `blockers` returns zero blockers.
4. `npm run lint && npm run build` passes.
