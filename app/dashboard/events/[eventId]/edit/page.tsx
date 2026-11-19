import { notFound } from "next/navigation";
import { EventForm } from "@/components/event/event-form";
import { requireHost } from "@/lib/auth";
import { getEvent } from "@/lib/db/events";
import { eventIdSchema, eventTimeZones } from "@/lib/validation/events";
import { saveEventAction } from "../../../actions";

export default async function EditEvent({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const host = await requireHost();
  const { eventId } = await params;
  if (!eventIdSchema.safeParse(eventId).success) notFound();
  const result = await getEvent(host.id, eventId);
  if (!result || result.event.status === "archived") notFound();
  const { event, role } = result;
  const defaults = {
    title: event.title,
    eventType: event.eventType,
    eventDate: event.eventDate,
    timezone: event.timezone,
    story: event.story,
    locationText: event.locationText,
    privacy: event.privacy,
    showGiverNamesToGuests: event.showGiverNamesToGuests,
    surpriseMode: event.surpriseMode,
  };
  return (
    <section className="mx-auto max-w-3xl space-y-6 pt-8">
      <h1 className="text-4xl sm:text-5xl">Edit event</h1>
      <EventForm
        event={defaults}
        canSetPrivacy={role === "owner"}
        timeZones={eventTimeZones}
        action={saveEventAction.bind(null, event.id)}
      />
    </section>
  );
}
