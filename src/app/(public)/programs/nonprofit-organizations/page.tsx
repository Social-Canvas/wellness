import { redirect } from "next/navigation"

import { NONPROFIT_LANDING_HREF } from "@/features/checkout/utils/membership-audience"

export default function NonprofitOrganizationsRedirectPage() {
  redirect(NONPROFIT_LANDING_HREF)
}
