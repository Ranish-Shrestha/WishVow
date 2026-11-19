# Phase 1 data model

Better Auth owns `users`, `sessions`, `accounts`, `verifications`, and `auth_rate_limits`. Auth identifiers use the library's generated text IDs. Event, membership, and participant IDs use PostgreSQL UUIDs. Timestamps are stored with time zones. Event calendar dates are stored separately from the event's IANA time zone.

`events` records lifecycle, event details, and privacy. A unique slug stays stable across edits. PostgreSQL checks the title, passcode hash consistency, and required lifecycle timestamps. Participant rows contain custom names and role labels. The shared owner is implicit.

`event_members` is the authorization boundary and has one row per host/event pair. Event creation writes the event and owner row in one transaction. Edits, participant changes, and lifecycle actions lock the event and the acting membership while checking permissions. Archiving preserves the event. An eventual hard delete of an event would cascade to its members and participants. Account deletion requires a policy for events and memberships first.

## Phase 2 additions

The `wishes` table stores type, category, visibility, ordering, optional event participant and image key, type-specific capacity, and monetary amounts in minor units. Database checks enforce type and monetary constraints. A composite foreign key keeps participants within the same event. A null participant indicates Shared. The `feature_rate_limits` table holds expiring counters for passcodes and uploads.

## Phase 3 additions

`guests` keeps normalized email scoped to an event. `commitments` stores a request or verified commitment with its wish, kind, terms, status, and timestamps. A partial unique index limits each guest to one pending, active, purchased, or fulfilled commitment per wish. Composite foreign keys prevent event mismatches. `guest_tokens` keeps purpose-specific hashes and expiry, consumption, and revocation timestamps.

Capacity sums count active, purchased, and fulfilled commitments. Event and wish row locks coordinate host edits and concurrent guest updates. Verification, reservations, pledges, and cancellation share these rules.

## Phase 5 additions

`invitation_cards` stores one invitation design per event, with validated style values and an optional private photo key. `invitations` stores a household label, party limit, credential hash and version, optional latest RSVP and message, and response and revocation times. A database check enforces either no reply, a decline with zero attending, or an accepted reply within the household limit. RSVP writes and host link changes synchronize on the event before changing a household record.

## Phase 4 additions

`commitments.host_note` contains the private fulfilment note. `contribution_receipts` holds one host-reported total per pledge, in its own currency and minor units. The total can be replaced or cleared. It never increases pledge capacity. `commitment_audit` records host status changes, receipt changes, and deliberate identity reveals without duplicating email addresses, notes, or payment details.
