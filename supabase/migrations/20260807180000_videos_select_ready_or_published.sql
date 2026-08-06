-- Allow members to read playback-ready videos.
-- Mux webhook marks assets `ready`; playback-token already accepts ready|published.
-- Restricting RLS to `published` only hid ready Autoimmune (and Reset) joins,
-- which surfaced as "No video" and false "Completed" badges.

drop policy if exists "videos_select_published" on public.videos;

create policy "videos_select_ready_or_published"
  on public.videos for select
  using (status in ('ready', 'published'));
