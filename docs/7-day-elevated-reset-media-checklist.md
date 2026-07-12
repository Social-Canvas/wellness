# 7-Day Elevated Reset — Media Migration Checklist

**Course slug (DB):** `7-day-reset-meditation-series`  
**Display title:** The 7-Day Elevated Reset  
**Launch state:** Course temporarily **`published`** for Welcome E2E testing; revert to `draft` after manual verification (see below). Remaining 21 lessons stay `draft`.

## Publish rules

1. Do **not** set a lesson to `published` until its linked `videos` row has `mux_playback_id` and `status` in (`ready`, `published`).
2. Keep the **course** in `draft` until you are ready to expose the full series (or a defined partial launch).
3. Keep **modules** in `draft` until at least one lesson in that module is published (or publish all module lessons together).
4. Membership `content_access` for plans 1–3 is unchanged; draft course status hides the course from the member library until launch.

## E2E test (Welcome lesson first)

Use this path to validate the full Mux pipeline before bulk migration.

| Step | Action |
|------|--------|
| 1 | Export **Welcome lesson/video** from GHL (source label below). |
| 2 | Admin → **Videos** → find `7-Day Elevated Reset — Welcome` (draft, `migration_status: not_started`). |
| 3 | Upload source file to Mux (direct upload or asset URL). Link `mux_asset_id` on the video row. |
| 4 | Wait for Mux webhook → `videos.status` becomes `ready`, `mux_playback_id` populated. |
| 5 | Admin: set video `status` → `published` (if not auto-published). |
| 6 | Admin: set lesson `welcome` / module `welcome` → `published` (course stays `draft` for isolated test). |
| 7 | Member with plan access: open course lesson player; confirm signed playback and progress saves (pause / ~17s interval). |
| 8 | Revert lesson/module to `draft` if course is not launching yet, or proceed with full launch checklist. |

**Optional SQL** after Mux webhook confirms ready: `supabase/scripts/publish-reset-welcome-e2e.sql`

## Per-lesson media map

| # | Module | Lesson slug | Lesson title | Video title (DB) | GHL source asset | Video record | Mux status | Lesson / attachment |
|---|--------|-------------|--------------|------------------|------------------|--------------|------------|---------------------|
| 1 | welcome | welcome | Welcome | 7-Day Elevated Reset — Welcome | Welcome lesson/video | published / verified | ready (`cevtQPbDchk4Foe666xyBV2KUyp7xbQSPhtFCMc7Kv4`) | published |
| 2 | day-1 | morning | Morning Meditation | 7-Day Elevated Reset — Day 1 Morning Meditation | Day 1 Morning Meditation | draft / not_started | pending | draft |
| 3 | day-1 | afternoon | Afternoon Regroup / Refocus | 7-Day Elevated Reset — Day 1 Afternoon Regroup / Refocus | Day 1 Afternoon Regroup / Refocus | draft / not_started | pending | draft |
| 4 | day-1 | evening | Evening Meditation | 7-Day Elevated Reset — Day 1 Evening Meditation | Day 1 Evening Meditation | draft / not_started | pending | draft |
| 5 | day-2 | morning | Morning Meditation | 7-Day Elevated Reset — Day 2 Morning Meditation | Day 2 Morning Meditation | draft / not_started | pending | draft |
| 6 | day-2 | afternoon | Afternoon Regroup / Refocus | 7-Day Elevated Reset — Day 2 Afternoon Regroup / Refocus | Day 2 Afternoon Regroup / Refocus | draft / not_started | pending | draft |
| 7 | day-2 | evening | Evening Meditation | 7-Day Elevated Reset — Day 2 Evening Meditation | Day 2 Evening Meditation | draft / not_started | pending | draft |
| 8 | day-3 | morning | Morning Meditation | 7-Day Elevated Reset — Day 3 Morning Meditation | Day 3 Morning Meditation | draft / not_started | pending | draft |
| 9 | day-3 | afternoon | Afternoon Regroup / Refocus | 7-Day Elevated Reset — Day 3 Afternoon Regroup / Refocus | Day 3 Afternoon Regroup / Refocus | draft / not_started | pending | draft |
| 10 | day-3 | evening | Evening Meditation | 7-Day Elevated Reset — Day 3 Evening Meditation | Day 3 Evening Meditation | draft / not_started | pending | draft |
| 11 | day-4 | morning | Morning Meditation | 7-Day Elevated Reset — Day 4 Morning Meditation | Day 4 Morning Meditation | draft / not_started | pending | draft |
| 12 | day-4 | afternoon | Afternoon Regroup / Refocus | 7-Day Elevated Reset — Day 4 Afternoon Regroup / Refocus | Day 4 Afternoon Regroup / Refocus | draft / not_started | pending | draft |
| 13 | day-4 | evening | Evening Meditation | 7-Day Elevated Reset — Day 4 Evening Meditation | Day 4 Evening Meditation | draft / not_started | pending | draft |
| 14 | day-5 | morning | Morning Meditation | 7-Day Elevated Reset — Day 5 Morning Meditation | Day 5 Morning Meditation | draft / not_started | pending | draft |
| 15 | day-5 | afternoon | Afternoon Regroup / Refocus | 7-Day Elevated Reset — Day 5 Afternoon Regroup / Refocus | Day 5 Afternoon Regroup / Refocus | draft / not_started | pending | draft |
| 16 | day-5 | evening | Evening Meditation | 7-Day Elevated Reset — Day 5 Evening Meditation | Day 5 Evening Meditation | draft / not_started | pending | draft |
| 17 | day-6 | morning | Morning Meditation | 7-Day Elevated Reset — Day 6 Morning Meditation | Day 6 Morning Meditation | draft / not_started | pending | draft |
| 18 | day-6 | afternoon | Afternoon Regroup / Refocus | 7-Day Elevated Reset — Day 6 Afternoon Regroup / Refocus | Day 6 Afternoon Regroup / Refocus | draft / not_started | pending | draft |
| 19 | day-6 | evening | Evening Meditation | 7-Day Elevated Reset — Day 6 Evening Meditation | Day 6 Evening Meditation | draft / not_started | pending | draft |
| 20 | day-7 | morning | Morning Meditation | 7-Day Elevated Reset — Day 7 Morning Meditation | Day 7 Morning Meditation | draft / not_started | pending | draft |
| 21 | day-7 | afternoon | Afternoon Regroup / Refocus | 7-Day Elevated Reset — Day 7 Afternoon Regroup / Refocus | Day 7 Afternoon Regroup / Refocus | draft / not_started | pending | draft |
| 22 | day-7 | evening | Evening Meditation | 7-Day Elevated Reset — Day 7 Evening Meditation | Day 7 Evening Meditation | draft / not_started | pending | draft |

**Column legend**

- **Video record:** `videos.status` / `videos.migration_status`
- **Mux status:** `pending` until `mux_playback_id` is set and webhook marks asset ready
- **Lesson / attachment:** `lessons.status` (no separate attachment files for video lessons)

## Full launch (after all 22 videos ready)

1. Publish each lesson (and its module) only when its video is Mux-ready.
2. Set `courses.status` → `published` for slug `7-day-reset-meditation-series`.
3. Smoke-test library listing, lesson navigation, playback, and resume for plan members.

## Reset Plan product entitlement (not implemented)

See engineering proposal in launch PR / handoff notes: product `7-day-reset` purchase should grant course access via `granted_course_id` on `products` + `canAccessCourse` fallback. Membership `content_access` rows are unaffected.
