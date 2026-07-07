import type { ReactNode } from "react"

import { Container, Section } from "@/components/layout"

type LeadPageShellProps = {
  children: ReactNode
}

function LeadPageShell({ children }: LeadPageShellProps) {
  return (
    <main>
      <Section padding="default">
        <Container size="narrow">{children}</Container>
      </Section>
    </main>
  )
}

export { LeadPageShell, type LeadPageShellProps }
