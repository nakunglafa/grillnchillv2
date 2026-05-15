"use client";

export function AboutTab() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-2xl border border-owner-border bg-owner-card p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-4 border-b border-owner-border pb-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-owner-action text-white shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-owner-charcoal">Restaurant management</h2>
            <p className="mt-1 font-medium text-owner-muted">Version 1.0.0</p>
          </div>
        </div>

        <div className="space-y-6">
          <section>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-owner-muted">Developer</h3>
            <div className="rounded-xl border border-owner-border/50 bg-owner-paper p-4">
              <p className="font-medium text-owner-charcoal">Developed by</p>
              <p className="mt-1 text-lg font-bold text-owner-charcoal">Krishna Bahadur Thapa</p>
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-owner-muted">About this software</h3>
            <div className="space-y-3 text-sm leading-relaxed text-owner-charcoal">
              <p>
                This dashboard and its connected services help you run day-to-day restaurant operations: website presence,
                menus, orders, reservations, and owner tools in one place.
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-owner-muted">
                <li>
                  <strong className="text-owner-charcoal">Orders:</strong> Receive and manage customer orders, including
                  checkout and status updates.
                </li>
                <li>
                  <strong className="text-owner-charcoal">Reservations:</strong> Table bookings and availability with
                  confirmations.
                </li>
                <li>
                  <strong className="text-owner-charcoal">Menu:</strong> Categories, items, variants, and ordering of how
                  dishes appear to guests.
                </li>
                <li>
                  <strong className="text-owner-charcoal">Content:</strong> Edit website text, promotions, and related
                  customer-facing material.
                </li>
              </ul>
              <p className="text-owner-muted">
                For privacy and data practices for your guests, see your site’s privacy page or contact your developer.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
