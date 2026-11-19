type Entry = {
  label: string;
  status: "attending" | "not_attending" | null;
  partySize: number | null;
  maxParty: number;
  message: string | null;
  respondedAt: Date | null;
  revokedAt: Date | null;
};

function cell(value: string | number | null) {
  const text = String(value ?? "");
  const formula = /^[\s\uFEFF]*[=+\-@]/u.test(text) || /^[\t\r\n]/u.test(text);
  return '"' + (formula ? "'" : "") + text.replaceAll('"', '""') + '"';
}

export function rsvpCsv(entries: Entry[]) {
  const header = [
    "Invitation",
    "Link status",
    "RSVP",
    "Party size",
    "Maximum party",
    "Message",
    "Responded at (UTC)",
  ];
  const rows = entries.map((entry) => [
    entry.label,
    entry.revokedAt ? "Revoked" : "Active",
    entry.status === "attending"
      ? "Attending"
      : entry.status === "not_attending"
        ? "Not attending"
        : "Awaiting reply",
    entry.partySize,
    entry.maxParty,
    entry.message,
    entry.respondedAt?.toISOString() ?? null,
  ]);
  return (
    "\uFEFF" +
    [header, ...rows].map((row) => row.map(cell).join(",")).join("\r\n") +
    "\r\n"
  );
}
