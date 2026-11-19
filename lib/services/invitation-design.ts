import { eventDate } from "@/lib/services/guest-wishes";
import type { InvitationCardInput } from "@/lib/validation/invitations";

export function invitationDate(date: string, locale: string) {
  return eventDate(date, locale);
}

export function invitationInk(backgroundColor: string) {
  const channels = [1, 3, 5].map((offset) => {
    const value =
      Number.parseInt(backgroundColor.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance =
    0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  return luminance > 0.179 ? "#000000" : "#ffffff";
}

export type InvitationDesign = InvitationCardInput & {
  imageKey: string | null;
};
