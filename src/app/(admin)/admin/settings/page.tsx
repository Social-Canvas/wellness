import { getCurrentUser } from "@/features/auth/services/auth.service"

export const metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
}

const INTEGRATION_GROUPS = [
  {
    label: "Supabase",
    names: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"],
  },
  {
    label: "Stripe",
    names: ["NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
  },
  {
    label: "Resend",
    names: ["RESEND_API_KEY", "TRANSACTIONAL_EMAIL_FROM", "TRANSACTIONAL_EMAIL_REPLY_TO"],
  },
  {
    label: "Kit",
    names: ["KIT_API_KEY", "KIT_SYNC_ENABLED", "KIT_NEWSLETTER_FORM_ID"],
  },
  {
    label: "Mux",
    names: ["MUX_TOKEN_ID", "MUX_TOKEN_SECRET", "MUX_SIGNING_KEY_ID", "MUX_SIGNING_PRIVATE_KEY", "MUX_WEBHOOK_SECRET"],
  },
  {
    label: "Cron and protection",
    names: ["CRON_SECRET", "TURNSTILE_SITE_KEY", "TURNSTILE_SECRET_KEY"],
  },
] as const

function isConfigured(name: string): boolean {
  return Boolean(process.env[name]?.trim())
}

export default async function AdminSettingsPage() {
  const user = await getCurrentUser()
  const isSuperAdmin = user.success && user.data.role === "super_admin"

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-[28px] font-medium text-ink">Settings</h2>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">
          Secrets stay in the hosting environment. This page shows whether a value is
          present. It never shows the value.
        </p>
      </div>
      {isSuperAdmin ? (
        <div className="grid gap-4">
          {INTEGRATION_GROUPS.map((group) => (
            <section key={group.label} className="rounded-2xl border border-line bg-surface px-5 py-4">
              <h3 className="font-display text-lg text-ink">{group.label}</h3>
              <ul className="mt-3 space-y-2">
                {group.names.map((name) => (
                  <li key={name} className="flex items-center justify-between gap-4 text-sm">
                    <code className="text-ink">{name}</code>
                    <span className={isConfigured(name) ? "text-green-deep" : "text-ink-soft"}>
                      {isConfigured(name) ? "Configured" : "Not set"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-line bg-cream2/50 px-6 py-8">
          <p className="text-sm text-ink">Status: super admin only</p>
          <p className="mt-2 text-sm text-ink-soft">
            Admins manage content, catalog, members, and reports. Integration status is
            visible to super admins.
          </p>
        </div>
      )}
    </div>
  )
}
