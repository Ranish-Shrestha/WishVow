import "server-only";

export function track(
  event:
    "commitment_confirmed" | "commitment_cancelled" | "commitment_unavailable",
) {
  console.info(JSON.stringify({ app: "wishvow", event }));
}
