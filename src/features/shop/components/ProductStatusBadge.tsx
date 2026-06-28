import { Badge } from "@/components/ui"
import type { Product } from "@/features/shop/types"

interface ProductStatusBadgeProps {
  product: Pick<Product, "status">
}

export function ProductStatusBadge({ product }: ProductStatusBadgeProps) {
  switch (product.status) {
    case "published":
      return <Badge variant="plan">Published</Badge>
    case "archived":
      return <Badge variant="outline">Archived</Badge>
    default:
      return <Badge variant="secondary">Draft</Badge>
  }
}
