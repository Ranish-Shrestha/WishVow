import { getHost } from "@/lib/auth";
import { invitationPng } from "@/lib/services/invitation-renderer";
import { invitationForExport } from "@/lib/services/invitations";
import { eventIdSchema } from "@/lib/validation/events";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  if (!eventIdSchema.safeParse(eventId).success)
    return new Response(null, { status: 404 });
  const host = await getHost();
  const result = host && (await invitationForExport(host.id, eventId));
  if (!result) return new Response(null, { status: 404 });
  return invitationPng(result.card, result.event.locale);
}
