import { Badge } from "@/components/ui"

interface LibraryCertificatePlaceholderProps {
  enabled: boolean
}

export function LibraryCertificatePlaceholder({
  enabled,
}: LibraryCertificatePlaceholderProps) {
  if (!enabled) {
    return null
  }

  return (
    <Badge variant="outline" title="Certificate tracking coming soon">
      Certificate eligible
    </Badge>
  )
}
