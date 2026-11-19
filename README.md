# WishVow

A Next.js app for creating wishlists and invitations for weddings, receptions, anniversaries, baby showers, and birthdays. Hosts can also track guest commitments and RSVPs.

## Local setup

1. Install Node.js 22.13+ or 24 LTS and run `npm ci`.
2. Copy `.env.example` to `.env.local`. Set `DATABASE_URL`, generate `AUTH_SECRET` using the template command, and match `APP_URL` to the browser origin.
3. Run `npm run db:migrate` and `npm run dev`. Open [http://localhost:3000](http://localhost:3000).
4. Create a host account, add a visible wish, preview it, and publish. Open its guest link in a separate browser session to try a commitment.
5. With `EMAIL_PROVIDER=local`, open the latest message in `.wishvow-mail/`, follow its verification URL, and explicitly confirm. The management link lets the guest edit or cancel.

Use `DATABASE_MIGRATION_URL` for a separate migration connection. `DATABASE_DRIVER` can be `neon` or `pg`. A standard Neon hostname selects the Neon driver automatically.

Use `STORAGE_PROVIDER=local` for development image uploads. The default directory is `.wishvow-storage/`, overridable with `WISHVOW_LOCAL_STORAGE_DIR`. Deployment uses a private Vercel Blob store and Resend. [Deployment setup](docs/DEPLOYMENT.md)

## Invitations and RSVPs

From a host's event page, open **Invitations & RSVPs**. Save a design using the Classic, Modern, or Garden template and create a link for each household. Publish the event to enable sharing and download a PNG or PDF with that household's RSVP QR code. For a QR code that scans from another device, use an `APP_URL` reachable by that device. The template URL uses localhost for local development.

Guests follow their private link to accept, decline, or update their response. The same host page shows totals and provides a CSV download. Rotating or revoking a link preserves the recorded RSVP.

## Phase status

| Phase | Status                                                                                                                                                        |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0–3   | Implemented and verified locally                                                                                                                              |
| 4     | Dashboard, fulfilment, privacy controls, and release preflight implemented. Hosted beta checks and publication pending.                                       |
| 5     | Invitations and RSVPs implemented and verified locally                                                                                                        |
| 6     | In progress. Anniversary, baby shower, and birthday event types implemented. AI assistance, localization, analytics, pricing, and payment assessment pending. |

Before starting a numbered phase, check this table for unfinished earlier work. Use the [release runbook](docs/DEPLOYMENT.md) before publishing. Enable `HOST_EMAIL_VERIFICATION=true` with the local mail adapter to exercise the same host email check used in production.

## Checks

- `npm run typecheck`, `npm run lint`, `npm run format:check`, and `npm run build` check the application.
- `npm test` runs unit and integration tests on isolated PGlite. For genuine concurrent connections, set `WISHVOW_TEST_POSTGRES_ADMIN_URL` to a disposable loopback PostgreSQL server and run `npm test -- tests/integration/commitments.test.ts`. The suite creates and drops its own randomly named database.
- `npx playwright install chromium` installs the browser. `npm run test:e2e` runs desktop and 320px mobile host and guest tests with isolated database, media, and email adapters.
- `npm run db:check` validates migration history. For schema changes, run `npm run db:generate`, review the SQL and commit it with its metadata.

A pending guest request holds no capacity. The app rechecks capacity after email verification. Pledges record an intention to give and the app collects no payment. Hosts can track fulfilment and manually record amounts received outside the app. Open Commitments from an event to filter its records and review totals.

See [architecture decisions](docs/DECISIONS.md), [guest security](docs/PRIVACY_SECURITY.md), and [actions](docs/API.md).
