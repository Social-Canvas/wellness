import type { Database } from "@/types/database/supabase"

export type Course = Database["public"]["Tables"]["courses"]["Row"]

export type PublishStatus = Database["public"]["Enums"]["publish_status"]

export type CoursePlanAccess = {
  id: string
  planId: string
  planName: string
  planSlug: string
  createdAt: string
}

export type CourseWithPlanAccess = Course & {
  planAccess: CoursePlanAccess[]
}
