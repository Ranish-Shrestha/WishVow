# Phase 0 and Phase 1 decisions

- Use Better Auth email/password for hosts. Store users, password hashes, and revocable sessions in PostgreSQL through its Drizzle adapter. Use the library's HTTP-only, SameSite cookies, secure on HTTPS, with database-backed rate limiting. Host email verification and reset delivery require a future email provider before public registration.
- Use Node.js App Router, Server Components for reads, Server Actions for authenticated event forms, and a Better Auth route handler. Check membership in server-side data access.
- Use Neon via Drizzle's WebSocket driver for interactive transactions. Use Drizzle's node-postgres driver for a standard local PostgreSQL connection.
- Phase 1 allows publishing event metadata before wishes exist. The first-visible-wish publish gate and guest route are Phase 2 work. Phase 1 records passcode preferences and hashes passcodes. Guest access grants and retry limits are required before any passcode-protected guest route goes live.
- The share slug is set once, with a readable prefix and a 96-bit cryptographic random suffix. The host can copy it from the event overview after publishing.
- An event's shared owner is implicit. Named participants carry free-text names and role labels. Owners and cohosts can manage event details and participants, while lifecycle and privacy changes are owner-only. Archive is terminal in Phase 1.

## Phase 2 decisions

- A draft now requires a visible, active wish to publish. Phase 1 events already marked published retain that status and can show an empty wishlist until a visible wish is added.
- Wishlist amounts are optional for physical gifts and experiences and required for group goals. Store amounts as integer minor units using currency-specific precision. An open wish defaults to one slot. Unlimited open wishes require an explicit opt-in with no quantity.
- A removed participant's wishes move to Shared. Archived wishes retain their records and leave the guest wishlist. Manual order is retained within each owner section.
- Use private Vercel Blob and same-origin image delivery so passcode and event visibility apply to images. Use local disk only during development or browser tests. Server uploads use a 4 MB file cap to fit within Vercel's request limit.
- Passcode grants expire after eight hours, are scoped to one event, and are bound to its current passcode hash. See [guest access and images](PRIVACY_SECURITY.md).

## Phase 3 decisions

- An email request never holds capacity. The verification POST rechecks the published event, current access settings, wish terms, and capacity in a transaction.
- A guest can have one current request or ongoing commitment per wish and make commitments on multiple distinct wishes. Repeated pending requests reuse the link and email idempotency key. Each confirmed commitment has its own management link.
- Pledges are recorded and displayed in minor units. No payment is collected. Edits are rechecked against current capacity. Cancellation stays available through a valid link after an event or wish is archived.
- Aggregate reserved, pledged, and promised amounts are visible to hosts. The commitment list, guest name visibility, host fulfilment, and release tooling remain Phase 4 work.

## Phase 5 decisions

- Phase 5 builds on Phases 0–3 in this checkout. Phase 4 remains separate.
- Each event has one saved design and can issue up to 500 household links. Hosts choose a preset and customize the names, date, venue, colors, and photo. Designs use the event's date and venue as defaults when available.
- A household can RSVP and edit its reply without an account. The maximum includes everyone in the household's party, including the person responding. Revoked links remain in the host's records and are excluded from totals.
- Each printable PNG and one-page PDF contains a QR code for that household's private invitation. The invitation links to the wishlist, where any existing passcode remains required. Hosts distribute links or files manually.
- Archived events close their invitation links. A link can also be rotated or permanently revoked without deleting the recorded reply.

## Phase 4 decisions

- A reservation can be marked purchased and then fulfilled. A reservation or service promise can also move directly from active to fulfilled. Active commitments can be cancelled unless they have a recorded received amount. Purchased and fulfilled gifts still consume capacity.
- Surprise mode suppresses giver name, email, and message in the host dashboard until fulfilment. The event owner can deliberately reveal verified giver details through an audited action when needed. Public wish details use the event’s visibility setting and the verified guest’s consent. Surprise mode delays any public name until fulfilment.
- Host-reported receipts are manual off-platform records, separate from pledges. A host can correct the recorded total or clear it with zero. Guests cannot reduce a pledge below its received amount or cancel it while an amount is recorded.
- Production host sessions require a verified email. Password reset revokes existing sessions. Local development can enable email verification explicitly or use it through the browser test setup.
- Phase 4 adds release preflight and local coverage. Hosted deployment and publication remain separate operational steps.
