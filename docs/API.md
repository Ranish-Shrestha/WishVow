# Phase 1 host actions

The Better Auth handler exposes host sign-up, sign-in, session, and sign-out under `/api/auth`. Event mutations use Next.js Server Actions. They derive the host ID from the database session on each request and validate submitted fields with Zod.

| Operation                       | Input                                                                                              | Access and result                                                                                                           |
| ------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Create event                    | Title, type, timezone, optional date/location/story, privacy preferences and passcode if protected | Any signed-in host. Creates a draft with the default locale and owner membership in one transaction. Redirects to overview. |
| Edit event                      | Event UUID and details, optional privacy fields                                                    | Owner or cohost on that event. Only owners can submit privacy changes. Redirects to overview.                               |
| Publish / archive               | Event UUID and target status                                                                       | Event owner. Drafts can publish or archive. Published events can archive. Archived events are read-only.                    |
| Add / edit / remove participant | Event UUID, participant UUID for edit/remove, name and role for add/edit                           | Owner or cohost on an editable event. Participant lookup is scoped to the supplied event.                                   |

Successful in-place mutations refresh server data and return status messages. Validation and access failures return a safe message or field errors. Unknown and inaccessible event URLs show the same unavailable page.

## Phase 2 wishlist and guest routes

- Host wishlist actions create and edit wishes, archive them, and move them up or down. An optional multipart image is validated and stored through the private media adapter. Only event members can manage wishes on editable events.
- `GET /e/[slug]` returns the published guest wishlist with owner, category, type, and text filters. `GET /e/[slug]/wishes/[wishId]` returns a visible wish. Both routes show an event passcode form when the request needs a grant.
- The passcode form uses a Server Action that verifies the passcode and sets an event-scoped cookie. `GET /e/[slug]/wishes/[wishId]/image` streams a private image only when that same event and wish are visible to the request.

## Phase 3 guest actions

- The guest wish form invokes a Server Action with the event slug, wish UUID, name, email, quantity or pledge amount, and optional message, date and display consent. The action checks event access, applies rate limits, and sends a verification email.
- `GET /guest/verify/[token]` displays confirmation without consuming the link. The explicit confirmation action consumes a valid token and atomically confirms the request if capacity remains.
- `GET /guest/manage/[token]` displays the single commitment authorized by the token. Its actions save a capacity-checked update or cancel an active commitment. Repeating cancellation succeeds without sending another email.
- The wish page also provides management-link recovery, with a neutral response and delivery to the email that verified the commitment.

## Phase 5 invitation and RSVP routes

- `/dashboard/events/[eventId]/invitations` lets event members manage the saved design, issue or rotate household links, and view RSVPs and party counts.
- `/dashboard/events/[eventId]/invitations/preview` generates the saved design preview. `/dashboard/events/[eventId]/invitations/cards/[invitationId]/[format]` generates an authorized PNG or PDF with the household QR code. `/dashboard/events/[eventId]/invitations/export` downloads the private RSVP CSV.
- `/invite/[token]` shows the invitation and that household's RSVP form. `/invite/[token]/photo` streams the optional photo through the same access check. Only active links for published events can view the page or save a reply.

## Phase 4 host commitment dashboard

`/dashboard/events/[eventId]/commitments` provides authorized event totals, paginated rows, and filters by wish, status, and commitment kind. An expired pending request is grouped under Expired. Surprise-mode fields are masked in the initial response. Only the event owner can explicitly reveal verified details before fulfilment, and that action is audited.

Host actions record permitted fulfilment transitions, cancel eligible commitments, and update a pledge’s host-reported received amount. Guest and host updates coordinate on the event lock. Cancelling a received pledge requires the host to resolve or clear the receipt first.
