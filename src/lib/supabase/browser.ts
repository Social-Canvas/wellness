import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

import { env } from "@/lib/config"
import type { Database } from "@/types/database/supabase"

let browserClient: SupabaseClient<Database> | undefined

export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
  }

  return browserClient
}
