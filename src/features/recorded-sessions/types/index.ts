import type { Database } from "@/types/database/supabase"

export type RecordedSession =
  Database["public"]["Tables"]["recorded_sessions"]["Row"]

export type RecordedSessionFocus =
  Database["public"]["Enums"]["recorded_session_focus"]

export type RecordedSessionPublicationStatus =
  Database["public"]["Enums"]["publish_status"]

export type RecordedSessionProcessingStatus =
  Database["public"]["Enums"]["video_status"]

/** Member-facing archive card / list item (no Mux IDs). */
export type RecordedSessionListItem = {
  id: string
  slug: string
  title: string
  shortDescription: string | null
  recordedAt: string | null
  publishedAt: string | null
  durationSeconds: number | null
  presenter: string | null
  monthlyTheme: string | null
  weekNumber: number | null
  weeklyTopic: string | null
  focus: RecordedSessionFocus | null
  thumbnailUrl: string | null
  displayOrder: number
}

export type RecordedSessionDetail = RecordedSessionListItem & {
  hasPlayableMux: boolean
}

export type RecordedSessionFilters = {
  theme?: string | null
  focus?: RecordedSessionFocus | null
  year?: number | null
  search?: string | null
}
