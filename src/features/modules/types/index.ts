import type { Database } from "@/types/database/supabase"

export type Module = Database["public"]["Tables"]["modules"]["Row"]

export type PublishStatus = Database["public"]["Enums"]["publish_status"]
