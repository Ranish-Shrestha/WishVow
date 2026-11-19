import { invitationForGuest } from "@/lib/services/invitations";
import { imageResponse } from "@/lib/storage";
import { invitationTokenSchema } from "@/lib/validation/invitations";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!invitationTokenSchema.safeParse(token).success)
    return imageResponse(null);
  const result = await invitationForGuest(token);
  return imageResponse(result?.card.imageKey ?? null);
}
