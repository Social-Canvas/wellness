import { NextResponse } from "next/server"

import { exportSalesOverview } from "@/features/admin-sales/services/sales-overview.service"
import { parseSalesExportSearchParams } from "@/features/admin-sales/utils/parse-search-params"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const parsed = parseSalesExportSearchParams(url.searchParams)

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "validation_error", message: parsed.message },
      },
      { status: 400 }
    )
  }

  const result = await exportSalesOverview(parsed.data)

  if (!result.success) {
    const status =
      result.error.code === "forbidden"
        ? 403
        : result.error.code === "authentication_required"
          ? 401
          : result.error.code === "validation_error"
            ? 400
            : 500

    return NextResponse.json(
      { success: false, error: result.error },
      {
        status,
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    )
  }

  return new NextResponse(new Uint8Array(result.data.body), {
    status: 200,
    headers: {
      "Content-Type": result.data.contentType,
      "Content-Disposition": `attachment; filename="${result.data.filename}"`,
      "Cache-Control": "private, no-store",
    },
  })
}
