import { z } from "zod";
import { getAuthConfig, getHost } from "@/lib/auth";
import { invitationDownload } from "@/lib/services/invitation-renderer";
import {
  invitationForExport,
  shareableInvitation,
} from "@/lib/services/invitations";

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ eventId: string; invitationId: string; format: string }>;
  },
) {
  const { eventId, invitationId, format } = await params;
  const type = z.enum(["png", "pdf"]).safeParse(format);
  if (
    !type.success ||
    !z.uuid().safeParse(eventId).success ||
    !z.uuid().safeParse(invitationId).success
  ) {
    return new Response(null, { status: 404 });
  }
  const host = await getHost();
  const result =
    host && (await invitationForExport(host.id, eventId, invitationId));
  if (!result || !result.recipient) return new Response(null, { status: 404 });
  const auth = getAuthConfig();
  const url = shareableInvitation(
    result.recipient,
    auth.AUTH_SECRET,
    auth.APP_URL,
  );
  if (!url) return new Response(null, { status: 404 });
  return invitationDownload(
    result.card,
    result.event.locale,
    { url, label: result.recipient.label },
    type.data,
  );
}
