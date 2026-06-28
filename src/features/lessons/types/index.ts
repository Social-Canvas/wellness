import type { Database } from "@/types/database/supabase"

export type Lesson = Database["public"]["Tables"]["lessons"]["Row"]

export type PublishStatus = Database["public"]["Enums"]["publish_status"]
