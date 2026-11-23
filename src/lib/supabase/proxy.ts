import { createServerClient } from "@supabase/ssr"
import { type NextRequest, NextResponse } from "next/server"

import { env } from "@/lib/config"
import type { Database } from "@/types/database/supabase"

function isProtectedPath(pathname: string) {
  return (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/")
  )
}

export async function updateSession(request: NextRequest) {
  const pendingCookies: {
    name: string
    value: string
    options?: Parameters<NextResponse["cookies"]["set"]>[2]
  }[] = []

  let supabaseResponse = NextResponse.next({
    request: {
      headers: (() => {
        const requestHeaders = new Headers(request.headers)
        requestHeaders.set("x-pathname", request.nextUrl.pathname)
        return requestHeaders
      })(),
    },
  })

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          pendingCookies.splice(0, pendingCookies.length, ...cookiesToSet)
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })

          const requestHeaders = new Headers(request.headers)
          requestHeaders.set("x-pathname", request.nextUrl.pathname)

          supabaseResponse = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          })

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && isProtectedPath(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("next", request.nextUrl.pathname)
    const redirectResponse = NextResponse.redirect(url)

    pendingCookies.forEach(({ name, value, options }) => {
      redirectResponse.cookies.set(name, value, options)
    })

    return redirectResponse
  }

  return supabaseResponse
}
