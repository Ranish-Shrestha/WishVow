# Vercel beta rollout

1. Import the project into Vercel with the Next.js preset and Node.js 22 or 24. Choose a stable HTTPS preview domain and a separate Neon database or branch for preview.
2. Set `APP_URL` to the exact HTTPS origin, `DATABASE_URL` to the preview's pooled TLS connection string, and `AUTH_SECRET` to a generated secret. Provide a separate direct `DATABASE_MIGRATION_URL` if operators use one.
3. Attach a private Vercel Blob store and set `STORAGE_PROVIDER=vercel_blob`. Confirm the project has `BLOB_STORE_ID` from its OIDC connection or `BLOB_READ_WRITE_TOKEN` for a token-based connection. Verify a Resend sender and set `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, and `EMAIL_FROM`. Set `PRIVACY_CONTACT_EMAIL` to the operator's public privacy address.
4. Run `npm ci`, `npm run release:check`, and `npm run db:migrate` with the preview settings. The release check validates configuration locally without contacting services. Apply migrations before sending traffic to the deployment.
5. Deploy the preview and perform the smoke checks below. Use test addresses and fixtures only. Review Privacy and Terms with the operator and establish retention, correction, and removal procedures.
6. Repeat with separate production credentials and a separate Neon database or branch. Verify the production deployment before distributing links. Keep access limited to invited testers for the beta.

## HTTPS preview smoke checks

- Create and verify a host, sign in, reset the password, and confirm an existing session is invalidated.
- Publish a passcode event with a Blob image. Check that guest requests without access fail to retrieve protected photos.
- Confirm a guest request by email, edit and cancel a commitment, and confirm capacity returns. Mark another gift purchased and fulfilled. Verify surprise-mode protection and opted-in name disclosure. Compare pledged and host-reported received totals.
- Generate a household invitation with a QR code. Open it on mobile, save an RSVP, then rotate the link and verify the old link is unavailable. Verify host-only CSV export.
- Review logs for delivery failures, rate limiting, and commitment outcomes. Redact private invitation, reset, and guest capability URLs. Review monitoring and operator contacts before beta.

## Rollback and recovery

Take a Neon branch or backup before schema changes and verify recovery options for the selected plan. Restore the previous app deployment if its schema is compatible. Use a reviewed forward fix or tested database restore for incompatible changes. Re-run the smoke checks before reopening beta access.

Verification in this workspace uses a disposable PostgreSQL database and development mail and image adapters. The hosted Vercel project, Neon connection, private Blob store, and Resend sender require operator access and a live smoke run.
