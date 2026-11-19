# Guest access and images

Published unlisted wishlists are readable by anyone with the URL. Passcode-protected wishlists use an eight-hour signed, HTTP-only grant scoped to the event path. The signature is bound to the event and its current password hash. Changing the passcode invalidates existing grants. Draft and archived events are unavailable to guests. Guest HTML, server payloads and image responses use private, no-store caching. Page metadata uses generic text and requests no indexing.

Passcode attempts are limited to eight per event and client IP per ten minutes on Vercel, using its forwarded client IP header. Local and other deployments use an event-wide fallback bucket. Rate-limit keys for passcodes use an HMAC so they contain no raw IP. Hosts can upload up to 30 images per ten minutes. Expired rate-limit rows are pruned opportunistically.

Wish images are re-encoded as WebP, stripped of metadata, and resized within a 1600px bounding box. Source files must be still JPEG, PNG, or WebP up to 4 MB and 25 million pixels. Private Blob objects can be read through the application only after host authorization or guest visibility and passcode checks. Guests who can view an image can save or forward their own copy.

Replaced or removed objects are deleted after the database commit. If cleanup fails or an upload or database response is ambiguous, an operator can reconcile the `wishes/` store prefix against `wishes.image_key`. Wait until any in-flight writes have finished and verify that a key has no reference before deleting it. Archived wishes retain their images for authorized host access.

## Guest commitment links

Verification links expire after 30 minutes and can be used once. A previewing email scanner can open the verification page without consuming the link. Management links are bearer credentials scoped to one commitment and expire after 30 days. Recovery reuses a valid link and rotates an expired link. Hide or redact token-bearing URLs from request analytics and shared logs.

The database stores token hashes. Guest email addresses and messages are restricted to server-side data access. Phase 3 public pages show aggregate availability only. Verification and recovery are limited to five emails per address and 50 attempts per Vercel client IP per 15 minutes. Other environments use a shared request bucket. Limit keys are HMAC-derived.

The development mail adapter saves JSON messages containing test addresses and private links to `.wishvow-mail/` unless a different directory is configured. Keep that directory private. Phase 3 sends confirmation, cancellation, and unavailable-request emails. Links that simply time out show an expiry state on open.

## Private invitations and RSVPs

An invitation link grants access to one household's invitation, photo, and latest RSVP. Treat the link and any export printed with its QR code as private. Invite URLs contain no household name or email. The database stores a link hash, and rotating or revoking the link removes access for anyone holding the old link or QR code. Archived events also disable access. The invitation's wishlist link uses the event's own access controls.

Host exports require event membership. CSV output includes RSVP records and messages without link credentials, and spreadsheet formula prefixes are escaped. Private invite routes request no caching, indexing, or referrer sharing. Redact invitation URLs from shared logs and analytics.

## Phase 4 release privacy review

The host dashboard always masks unverified giver details. With surprise mode enabled, verified identities stay hidden until fulfilment unless the event owner explicitly reveals them for an operational need. This action creates an audit entry. Public wish details disclose only opted-in display names when the event permits and the current commitment qualifies. Email, messages, and receipt amounts never appear in the public wish projection.

Commitment confirmation and management mutations are IP-rate-limited. The shared fallback bucket applies when a trusted Vercel address is unavailable. Verification email limits check the IP allowance before creating an address bucket. Structured outcome logs record only event names, with no addresses, bodies, IDs, or link credentials. Redact capability URLs from hosting logs and any future analytics.

Draft Privacy and Terms pages describe current behavior. Before publishing, confirm the operator contact, retention periods, deletion handling, and wording against the actual deployment. [Privacy notice guidance](https://www.priv.gc.ca/en/privacy-topics/privacy-for-businesses/appropriate-handling-of-personal-information/collecting-personal-information-and-consent/02_05_d_56_tips2/)
