import type {
  CommitmentKind,
  CommitmentStatus,
} from "@/lib/validation/host-commitments";

export type Fulfilment = "purchased" | "fulfilled" | "cancelled";

export function fulfilmentOptions(
  kind: CommitmentKind,
  status: CommitmentStatus,
  receivedMinor = 0,
): Fulfilment[] {
  if (status === "purchased")
    return kind === "reservation" ? ["fulfilled"] : [];
  if (status !== "active") return [];
  if (kind === "pledge") return receivedMinor ? [] : ["cancelled"];
  return kind === "reservation"
    ? ["purchased", "fulfilled", "cancelled"]
    : ["fulfilled", "cancelled"];
}

export function commitmentStatusLabel(
  status: CommitmentStatus,
  kind?: CommitmentKind,
) {
  if (status === "active") {
    if (kind === "reservation") return "Reserved";
    if (kind === "pledge") return "Pledged";
    if (kind === "service_promise") return "Promised";
    return "Active";
  }
  return {
    pending_verification: "Awaiting verification",
    purchased: "Purchased",
    fulfilled: "Fulfilled",
    cancelled: "Cancelled",
    expired: "Expired",
  }[status];
}
