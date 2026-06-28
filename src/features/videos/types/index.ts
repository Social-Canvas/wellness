import type { Database } from "@/types/database/supabase"

export type Video = Database["public"]["Tables"]["videos"]["Row"]

export type VideoStatus = Database["public"]["Enums"]["video_status"]

export type MigrationStatus = Database["public"]["Enums"]["migration_status"]
