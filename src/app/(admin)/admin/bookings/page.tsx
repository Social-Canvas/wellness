export const metadata = {
  title: "Bookings",
  robots: { index: false, follow: false },
}

export default function AdminBookingsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-[28px] font-medium text-ink">Bookings</h2>
        <p className="mt-1 text-sm text-ink-soft">
          This admin destination is a placeholder. Live session booking is handled
          with Zoom participant links after entitlement checks. Calendly remains
          an external scheduling option where configured. There is no internal
          bookings database or CRUD here.
        </p>
      </div>
      <div className="rounded-2xl border border-dashed border-line bg-cream2/50 px-6 py-8">
        <p className="text-sm text-ink">Status: unused placeholder</p>
        <p className="mt-2 text-sm text-ink-soft">
          Use Admin → Live Sessions for class metadata and dashboard live-session
          join for entitled members.
        </p>
      </div>
    </div>
  )
}
