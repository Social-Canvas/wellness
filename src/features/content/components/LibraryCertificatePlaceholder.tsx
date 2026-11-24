import { Badge } from "@/components/ui"
import { CERTIFICATES_OFFERED } from "@/features/auth/utils/certificate-name"

interface LibraryCertificatePlaceholderProps {
  enabled: boolean
}

export function LibraryCertificatePlaceholder({
  enabled,
}: LibraryCertificatePlaceholderProps) {
  // Certificates are not offered. The badge stays in this file so it can be
  // restored without rebuilding the library card.
  if (!enabled || !CERTIFICATES_OFFERED) {
    return null
  }

  return (
    <Badge variant="outline" title="Certificate tracking coming soon">
      Certificate eligible
    </Badge>
  )
}
