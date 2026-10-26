"use client"

import { createContext, useContext, type ReactNode } from "react"

const TurnstileSiteKeyContext = createContext<string | null>(null)

export function TurnstileConfigProvider({
  siteKey,
  children,
}: {
  siteKey: string | null
  children: ReactNode
}) {
  return (
    <TurnstileSiteKeyContext.Provider value={siteKey}>
      {children}
    </TurnstileSiteKeyContext.Provider>
  )
}

export function useTurnstileSiteKey(): string | null {
  return useContext(TurnstileSiteKeyContext)
}
