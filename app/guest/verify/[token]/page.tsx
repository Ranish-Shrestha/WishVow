import { VerifyForm } from "@/components/guest/verify-form";
import { verificationPage } from "@/lib/services/commitments";
import { displayMoney } from "@/lib/utils/money";
import { guestTokenSchema } from "@/lib/validation/commitments";

export default async function VerifyCommitmentPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const request = guestTokenSchema.safeParse(token).success
    ? await verificationPage(token)
    : null;
  if (!request)
    return (
      <>
        <h1 className="text-4xl">Verification link unavailable</h1>
        <p className="text-muted-foreground">
          This link is invalid, has expired, or was already used. Open the
          original wish to request a new link or recover your management link.
        </p>
      </>
    );

  return (
    <>
      <h1 className="text-4xl">Confirm your commitment</h1>
      <div className="rounded-lg bg-muted p-4 text-sm">
        <p className="break-words font-semibold">{request.displayName}</p>
        <p>
          {request.amountMinor && request.currency
            ? `Pledge amount ${displayMoney(request.amountMinor, request.currency, "en-CA")}`
            : request.kind === "service_promise"
              ? `Requested slots ${request.quantity}`
              : `Requested quantity ${request.quantity}`}
        </p>
      </div>
      <p className="text-muted-foreground">
        We’ll check availability when you confirm. If it’s still available, your
        commitment becomes active. No payment is collected here.
      </p>
      <VerifyForm token={token} />
    </>
  );
}
