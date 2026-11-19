import { z } from "zod";
import { getHost } from "@/lib/auth";
import { getHostWish } from "@/lib/services/wishes";
import { imageResponse } from "@/lib/storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string; wishId: string }> },
) {
  const { eventId, wishId } = await params;
  if (
    !z.uuid().safeParse(eventId).success ||
    !z.uuid().safeParse(wishId).success
  )
    return imageResponse(null);
  const host = await getHost();
  if (!host) return imageResponse(null);
  const wish = await getHostWish(host.id, eventId, wishId);
  return imageResponse(wish?.imageKey ?? null);
}
