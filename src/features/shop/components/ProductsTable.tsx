"use client"

import { useState } from "react"

import {
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui"
import type { Product } from "@/features/shop/types"
import { formatProductPrice, formatProductType } from "@/features/shop/utils/format-product"

import { ArchiveProductDialog } from "./ArchiveProductDialog"
import { CreateProductDialog } from "./CreateProductDialog"
import { EditProductDialog } from "./EditProductDialog"
import { ProductStatusBadge } from "./ProductStatusBadge"

interface ProductsTableProps {
  products: Product[]
}

export function ProductsTable({ products }: ProductsTableProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [archiveProduct, setArchiveProduct] = useState<Product | null>(null)

  if (products.length === 0) {
    return (
      <>
        <div className="rounded-2xl border border-dashed border-line bg-cream2/50 px-6 py-10 text-center">
          <p className="font-display text-lg font-medium text-ink">No products yet</p>
          <p className="mt-2 text-sm text-ink-soft">
            Create your first digital product for the shop.
          </p>
          <div className="mt-5">
            <Button type="button" onClick={() => setCreateOpen(true)}>
              Create product
            </Button>
          </div>
        </div>

        <CreateProductDialog open={createOpen} onOpenChange={setCreateOpen} />
      </>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">
          {products.length} product{products.length === 1 ? "" : "s"}
        </p>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          Create product
        </Button>
      </div>

      <Card className="mt-4">
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stripe price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-ink">{product.title}</p>
                      <p className="text-xs text-ink-soft">{product.slug}</p>
                    </div>
                  </TableCell>
                  <TableCell>{formatProductType(product.product_type)}</TableCell>
                  <TableCell>
                    {formatProductPrice(product.price_amount, product.currency)}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-ink-soft">
                    {product.stripe_price_id ?? "Not set"}
                  </TableCell>
                  <TableCell>
                    <ProductStatusBadge product={product} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditProduct(product)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={product.status === "archived"}
                        onClick={() => setArchiveProduct(product)}
                      >
                        Archive
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CreateProductDialog open={createOpen} onOpenChange={setCreateOpen} />
      <EditProductDialog
        product={editProduct}
        open={Boolean(editProduct)}
        onOpenChange={(open) => {
          if (!open) {
            setEditProduct(null)
          }
        }}
      />
      <ArchiveProductDialog
        product={archiveProduct}
        open={Boolean(archiveProduct)}
        onOpenChange={(open) => {
          if (!open) {
            setArchiveProduct(null)
          }
        }}
      />
    </>
  )
}
