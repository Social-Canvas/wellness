"use client"

import { useMemo, useState } from "react"

import { Input, Label } from "@/components/ui"
import { RecordedSessionCard } from "@/features/recorded-sessions/components/RecordedSessionCard"
import type {
  RecordedSessionFocus,
  RecordedSessionListItem,
} from "@/features/recorded-sessions/types"
import {
  filterRecordedSessions,
  shouldShowArchiveFilters,
} from "@/features/recorded-sessions/utils/recorded-sessions"

interface RecordedSessionsArchiveProps {
  sessions: RecordedSessionListItem[]
}

const FOCUS_OPTIONS: Array<{ value: "" | RecordedSessionFocus; label: string }> = [
  { value: "", label: "All focus" },
  { value: "awareness", label: "Awareness" },
  { value: "release", label: "Release" },
  { value: "embodiment", label: "Embodiment" },
  { value: "integration", label: "Integration" },
]

export function RecordedSessionsArchive({ sessions }: RecordedSessionsArchiveProps) {
  const showFilters = shouldShowArchiveFilters(sessions)
  const [theme, setTheme] = useState("")
  const [focus, setFocus] = useState<"" | RecordedSessionFocus>("")
  const [year, setYear] = useState("")
  const [search, setSearch] = useState("")

  const themes = useMemo(() => {
    return [...new Set(sessions.map((s) => s.monthlyTheme).filter(Boolean) as string[])].sort()
  }, [sessions])

  const years = useMemo(() => {
    return [
      ...new Set(
        sessions
          .map((s) => (s.recordedAt ? Number(s.recordedAt.slice(0, 4)) : null))
          .filter((y): y is number => y !== null)
      ),
    ].sort((a, b) => b - a)
  }, [sessions])

  const filtered = useMemo(
    () =>
      filterRecordedSessions(sessions, {
        theme: theme || null,
        focus: focus || null,
        year: year ? Number(year) : null,
        search: search || null,
      }),
    [sessions, theme, focus, year, search]
  )

  const [latest, ...archive] = filtered

  return (
    <div className="space-y-8">
      {showFilters ? (
        <div className="grid gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="rs-search">Search</Label>
            <Input
              id="rs-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Title or topic"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rs-theme">Theme</Label>
            <select
              id="rs-theme"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={theme}
              onChange={(event) => setTheme(event.target.value)}
            >
              <option value="">All themes</option>
              {themes.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rs-focus">Focus</Label>
            <select
              id="rs-focus"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={focus}
              onChange={(event) =>
                setFocus(event.target.value as "" | RecordedSessionFocus)
              }
            >
              {FOCUS_OPTIONS.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rs-year">Year</Label>
            <select
              id="rs-year"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={year}
              onChange={(event) => setYear(event.target.value)}
            >
              <option value="">All years</option>
              {years.map((value) => (
                <option key={value} value={String(value)}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      {latest ? <RecordedSessionCard session={latest} featured /> : null}

      {archive.length > 0 ? (
        <section className="space-y-4">
          <h2 className="font-display text-xl font-medium text-ink">Archive</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {archive.map((item) => (
              <RecordedSessionCard key={item.id} session={item} />
            ))}
          </div>
        </section>
      ) : null}

      {filtered.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-dashed border-line bg-cream2/40 px-6 py-10 text-center">
          <p className="font-display text-lg font-medium text-ink">No sessions match</p>
          <p className="mt-2 text-sm text-ink-soft">
            Try clearing filters or check back after the next weekly publish.
          </p>
        </div>
      ) : null}
    </div>
  )
}
