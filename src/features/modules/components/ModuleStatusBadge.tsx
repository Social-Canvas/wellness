import { Badge } from "@/components/ui"
import type { Module } from "@/features/modules/types"

interface ModuleStatusBadgeProps {
  module: Pick<Module, "status">
}

export function ModuleStatusBadge({ module }: ModuleStatusBadgeProps) {
  if (module.status === "published") {
    return <Badge variant="plan">Published</Badge>
  }

  if (module.status === "archived") {
    return <Badge variant="outline">Archived</Badge>
  }

  return <Badge variant="secondary">Draft</Badge>
}
