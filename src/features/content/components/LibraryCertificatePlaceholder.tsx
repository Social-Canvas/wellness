import { Badge } from "@/components/ui"

interface LibraryCertificatePlaceholderProps {
  enabled: boolean
}

export function LibraryCertificatePlaceholder({
  enabled,
}: LibraryCertificatePlaceholderProps) {
  // Certificates are not offered. The badge stays in this file so it can be
  // restored without rebuilding the library card.
  const certificatesOffered = false
  if (!enabled || !certificatesOffered) {
    return null
  }

  return (
    <Badge variant="outline" title="Certificate tracking coming soon">
      Certificate eligible
    </Badge>
  )
}
