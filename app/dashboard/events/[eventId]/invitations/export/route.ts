import { getHost } from "@/lib/auth";
import { invitationDashboard } from "@/lib/services/invitations";
import { rsvpCsv } from "@/lib/services/rsvp-csv";
import { eventIdSchema } from "@/lib/validation/events";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  if (!eventIdSchema.safeParse(eventId).success)
    return new Response(null, { status: 404 });
  const host = await getHost();
  const result = host && (await invitationDashboard(host.id, eventId));
  if (!result?.card) return new Response(null, { status: 404 });
  return new Response(rsvpCsv(result.recipients), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="wishvow-rsvps.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}
