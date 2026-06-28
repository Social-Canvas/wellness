import type { ReactNode } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui"
import type { Module } from "@/features/modules/types"

import { ModuleStatusBadge } from "./ModuleStatusBadge"

interface ModuleCardProps {
  module: Module
  actions?: ReactNode
}

export function ModuleCard({ module, actions }: ModuleCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="font-display text-lg font-medium">
            {module.title}
          </CardTitle>
          <p className="mt-1 text-sm text-ink-soft">{module.slug}</p>
        </div>
        <ModuleStatusBadge module={module} />
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-ink-soft">
        <p>
          <span className="font-semibold text-ink">Sort order:</span>{" "}
          {module.sort_order}
        </p>
        {actions ? <div className="flex flex-wrap gap-2 pt-1">{actions}</div> : null}
      </CardContent>
    </Card>
  )
}
