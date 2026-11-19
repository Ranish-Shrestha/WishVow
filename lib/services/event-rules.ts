import { randomBytes } from "node:crypto";

type Status = "draft" | "published" | "archived";
type Role = "owner" | "cohost";

export function eventSlug(title: string) {
  const prefix =
    title
      .normalize("NFKD")
      .replace(/\p{Mark}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 48)
      .replace(/^-|-$/g, "") || "event";
  return `${prefix}-${randomBytes(12).toString("hex")}`;
}

export function canTransition(
  role: Role,
  status: Status,
  target: Exclude<Status, "draft">,
) {
  return (
    role === "owner" &&
    (status === "draft" || (status === "published" && target === "archived"))
  );
}
