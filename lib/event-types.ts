export const eventTypes = [
  "wedding",
  "reception",
  "wedding_and_reception",
  "anniversary",
  "baby_shower",
  "birthday",
] as const;

export type EventType = (typeof eventTypes)[number];

export const eventTypeLabels: Record<EventType, string> = {
  wedding: "Wedding",
  reception: "Reception",
  wedding_and_reception: "Wedding and reception",
  anniversary: "Anniversary",
  baby_shower: "Baby shower",
  birthday: "Birthday",
};
