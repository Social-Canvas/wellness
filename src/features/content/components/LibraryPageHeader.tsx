import Link from "next/link"
import type { ReactNode } from "react"

interface LibraryBreadcrumbProps {
  items: Array<{
    label: string
    href?: string
  }>
}

export function LibraryBreadcrumb({ items }: LibraryBreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-ink-soft">
        {items.map((item, index) => {
          const isLast = index === items.length - 1

          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 ? <span aria-hidden="true">·</span> : null}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="font-semibold text-blue hover:text-blue-deep"
                >
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? "font-medium text-ink" : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

interface LibraryPageHeaderProps {
  breadcrumb: LibraryBreadcrumbProps["items"]
  title: string
  description?: string | null
  meta?: ReactNode
}

export function LibraryPageHeader({
  breadcrumb,
  title,
  description,
  meta,
}: LibraryPageHeaderProps) {
  return (
    <div className="space-y-3">
      <LibraryBreadcrumb items={breadcrumb} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-[28px] font-medium text-ink">{title}</h2>
          {description ? (
            <p className="mt-1 max-w-3xl text-sm text-ink-soft">{description}</p>
          ) : null}
        </div>
        {meta}
      </div>
    </div>
  )
}
