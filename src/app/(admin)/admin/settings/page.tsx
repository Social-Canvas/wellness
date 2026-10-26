export const metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
}

export default function AdminSettingsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-[28px] font-medium text-ink">Settings</h2>
        <p className="mt-1 text-sm text-ink-soft">
          There is no in-app integrations or secrets settings screen. Environment
          variables live in Vercel. Roles are granted from Admin → Members by a
          Super Admin, or via documented SQL for the first Super Admin.
        </p>
      </div>
      <div className="rounded-2xl border border-dashed border-line bg-cream2/50 px-6 py-8">
        <p className="text-sm text-ink">Status: unused placeholder</p>
        <p className="mt-2 text-sm text-ink-soft">
          This page does not expose API keys, webhook secrets, or provider tokens.
        </p>
      </div>
    </div>
  )
}
