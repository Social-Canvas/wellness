import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui"
import { DeactivatePromoCodeButton } from "@/features/promo-codes/components/deactivate-promo-code-button"
import type { PromoCodeListItem } from "@/features/promo-codes/utils/promo-code-mapping"

interface PromoCodeListProps {
  items: PromoCodeListItem[]
  truncated: boolean
}

export function PromoCodeList({ items, truncated }: PromoCodeListProps) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="font-display text-lg text-ink">Existing codes</h3>
        <p className="mt-1 text-sm text-ink-soft">
          Active codes can be turned off. They cannot be edited.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-cream2/50 px-6 py-8">
          <p className="text-sm text-ink">No promo codes yet.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Times used</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium text-ink">{item.code}</TableCell>
                  <TableCell>{item.discountLabel}</TableCell>
                  <TableCell>{item.durationLabel}</TableCell>
                  <TableCell>{item.redemptionLabel}</TableCell>
                  <TableCell>{item.active ? "Yes" : "No"}</TableCell>
                  <TableCell>{item.expiresLabel}</TableCell>
                  <TableCell>
                    {item.active ? (
                      <DeactivatePromoCodeButton
                        promotionCodeId={item.id}
                        code={item.code}
                      />
                    ) : (
                      <span className="text-sm text-ink-soft">Off</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {truncated ? (
        <p className="text-sm text-ink-soft">
          Showing the newest 100 codes. Older codes remain in Stripe.
        </p>
      ) : null}
    </section>
  )
}
