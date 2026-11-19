import { ManageForm } from "@/components/guest/manage-form";
import { managedCommitment } from "@/lib/services/commitments";
import { amountInput, displayMoney } from "@/lib/utils/money";
import { guestTokenSchema } from "@/lib/validation/commitments";

export default async function ManageCommitmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ confirmed?: string; updated?: string }>;
}) {
  const { token } = await params;
  const result = guestTokenSchema.safeParse(token).success
    ? await managedCommitment(token)
    : null;
  if (!result)
    return (
      <>
        <h1 className="text-4xl">Management link unavailable</h1>
        <p className="text-muted-foreground">
          This link is invalid or has expired. Return to the original wish to
          request a new link.
        </p>
      </>
    );

  const { confirmed, updated } = await searchParams;
  const status =
    result.status === "active"
      ? {
          reservation: "Reserved",
          pledge: "Pledged",
          service_promise: "Promised",
        }[result.kind]
      : result.status;
  const notice =
    result.status === "active" && confirmed === "1"
      ? "Your commitment is confirmed."
      : result.status === "active" && updated === "edit"
        ? "Your changes were saved."
        : result.status === "cancelled" && updated === "cancel"
          ? "Your commitment was cancelled."
          : null;

  return (
    <>
      <h1 className="text-4xl">Your commitment</h1>
      {notice && (
        <p role="status" className="font-semibold text-primary">
          {notice}
        </p>
      )}
      {confirmed === "1" && result.status === "active" && (
        <p className="text-sm text-muted-foreground">
          Save this private link to review your commitment later.
        </p>
      )}
      <div className="space-y-2">
        <h2 className="break-words text-2xl">{result.wishTitle}</h2>
        <p className="font-semibold capitalize">{status}</p>
        {result.amountMinor && result.currency ? (
          <p>
            {displayMoney(result.amountMinor, result.currency, "en-CA")}{" "}
            pledged. No payment was collected.
          </p>
        ) : (
          <p>Quantity {result.quantity}</p>
        )}
        {result.expectedFulfilmentDate && (
          <p>Expected fulfilment {result.expectedFulfilmentDate}</p>
        )}
        {result.message && (
          <p className="break-words whitespace-pre-wrap text-muted-foreground">
            {result.message}
          </p>
        )}
      </div>
      {result.status === "active" && !result.canCancel && (
        <p className="text-sm text-muted-foreground">
          Contact the host to resolve the recorded received amount before
          cancelling.
        </p>
      )}
      {result.status === "active" && (result.canEdit || result.canCancel) && (
        <ManageForm
          token={token}
          canEdit={result.canEdit}
          canCancel={result.canCancel}
          type={result.wishType}
          currency={result.currency}
          defaults={{
            ...result,
            amount: result.currency
              ? amountInput(result.amountMinor, result.currency)
              : undefined,
          }}
        />
      )}
    </>
  );
}
