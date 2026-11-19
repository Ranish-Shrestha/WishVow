import { z } from "zod";
import { getGuestImageKey } from "@/lib/db/guest-events";
import { guestAccess } from "@/lib/security/event-access";
import { imageResponse } from "@/lib/storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; wishId: string }> },
) {
  const { slug, wishId } = await params;
  if (!z.uuid().safeParse(wishId).success) return imageResponse(null);
  const access = await guestAccess(slug);
  if (!access?.allowed) return imageResponse(null);
  return imageResponse(await getGuestImageKey(access.gate, wishId));
}
