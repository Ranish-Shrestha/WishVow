import { EventForm } from "@/components/event/event-form";
import { HostPageHeader } from "@/components/host/host-page-header";
import { requireHost } from "@/lib/auth";
import { eventTimeZones } from "@/lib/validation/events";
import { saveEventAction } from "../../actions";

export default async function NewEvent() {
  await requireHost();
  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <HostPageHeader
        title="New event"
        back={{
          href: "/dashboard",
          label: "Back to my events",
          text: "My events",
        }}
      />
      <EventForm
        canSetPrivacy
        timeZones={eventTimeZones}
        action={saveEventAction.bind(null, null)}
      />
    </section>
  );
}
