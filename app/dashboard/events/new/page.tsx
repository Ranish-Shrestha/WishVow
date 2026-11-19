import { EventForm } from "@/components/event/event-form";
import { requireHost } from "@/lib/auth";
import { eventTimeZones } from "@/lib/validation/events";
import { saveEventAction } from "../../actions";

export default async function NewEvent() {
  await requireHost();
  return (
    <section className="mx-auto max-w-3xl space-y-6 pt-8">
      <h1 className="text-4xl sm:text-5xl">New event</h1>
      <EventForm
        canSetPrivacy
        timeZones={eventTimeZones}
        action={saveEventAction.bind(null, null)}
      />
    </section>
  );
}
