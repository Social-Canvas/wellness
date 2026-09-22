import ExcelJS from "exceljs"

import type { SalesOverviewSnapshot } from "./sales-overview-types"

function styleHeaderRow(row: ExcelJS.Row): void {
  row.font = { bold: true }
  row.commit()
}

function freezeHeader(sheet: ExcelJS.Worksheet): void {
  sheet.views = [{ state: "frozen", ySplit: 1 }]
}

function autoWidth(sheet: ExcelJS.Worksheet, min = 12, max = 48): void {
  for (const column of sheet.columns) {
    let width = min
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const length = String(cell.value ?? "").length + 2
      if (length > width) {
        width = Math.min(max, length)
      }
    })
    column.width = width
  }
}

export async function buildSalesOverviewXlsx(
  snapshot: SalesOverviewSnapshot
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "Elevate Admin"
  workbook.created = new Date(snapshot.generatedAt)

  const summary = workbook.addWorksheet("Summary")
  summary.addRow(["Metric", "Value", "Note", "Date filter applies"])
  styleHeaderRow(summary.getRow(1))
  freezeHeader(summary)
  for (const metric of snapshot.metrics) {
    summary.addRow([
      metric.label,
      metric.displayValue,
      metric.note ?? "",
      metric.dateFilterApplies ? "yes" : "no (current state)",
    ])
  }
  summary.addRow([])
  summary.addRow(["Date range", snapshot.dateRange.label])
  summary.addRow(["Generated at", snapshot.generatedAt])
  summary.addRow([])
  summary.addRow(["Limitations"])
  for (const limitation of snapshot.limitations) {
    summary.addRow([limitation])
  }
  summary.addRow([snapshot.exclusionSummary])
  autoWidth(summary)

  const transactions = workbook.addWorksheet("Transactions")
  transactions.addRow([
    "Customer name",
    "Customer email",
    "Product or plan",
    "Type",
    "Amount",
    "Currency",
    "Date",
    "Status",
  ])
  styleHeaderRow(transactions.getRow(1))
  freezeHeader(transactions)
  for (const row of snapshot.recentSales) {
    const amount =
      row.amountCents === null
        ? "See Stripe for membership renewals"
        : row.amountCents / 100
    const excelRow = transactions.addRow([
      row.customerName ?? "",
      row.customerEmail,
      row.productOrPlan,
      row.type === "one_time" ? "One-time purchase" : "Membership",
      amount,
      row.currency?.toUpperCase() ?? "",
      row.occurredAt ? new Date(row.occurredAt) : "",
      row.status,
    ])
    if (typeof amount === "number") {
      excelRow.getCell(5).numFmt = '"$"#,##0.00'
    }
    excelRow.getCell(7).numFmt = "yyyy-mm-dd hh:mm"
  }
  autoWidth(transactions)

  const products = workbook.addWorksheet("Purchases by Product")
  products.addRow(["Product name", "Purchase count", "Revenue", "Currency"])
  styleHeaderRow(products.getRow(1))
  freezeHeader(products)
  for (const row of snapshot.purchasesByProduct) {
    const excelRow = products.addRow([
      row.productName,
      row.purchaseCount,
      row.revenueCents / 100,
      row.currency.toUpperCase(),
    ])
    excelRow.getCell(3).numFmt = '"$"#,##0.00'
  }
  autoWidth(products)

  const tiers = workbook.addWorksheet("Memberships by Tier")
  tiers.addRow(["Tier", "Active count", "Source"])
  styleHeaderRow(tiers.getRow(1))
  freezeHeader(tiers)
  for (const row of snapshot.membershipsByTier) {
    tiers.addRow([
      row.tierLabel,
      row.activeCount,
      row.source === "sponsored"
        ? "Sponsored"
        : row.source === "mixed"
          ? "Mixed"
          : "Personal membership",
    ])
  }
  autoWidth(tiers)

  const marketing = workbook.addWorksheet("Marketing")
  marketing.addRow(["Email", "Status", "Source", "Consented at"])
  styleHeaderRow(marketing.getRow(1))
  freezeHeader(marketing)
  for (const row of snapshot.marketingConsents) {
    const excelRow = marketing.addRow([
      row.email,
      row.status,
      row.source,
      row.consentedAt ? new Date(row.consentedAt) : "",
    ])
    excelRow.getCell(4).numFmt = "yyyy-mm-dd hh:mm"
  }
  if (snapshot.marketingConsents.length === 0) {
    marketing.addRow(["(none in selected range)", "", "", ""])
  }
  autoWidth(marketing)

  const arrayBuffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(arrayBuffer)
}
