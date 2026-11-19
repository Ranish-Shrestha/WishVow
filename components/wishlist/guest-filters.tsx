import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { wishCategories, wishTypes } from "@/lib/validation/wishes";

export type Filters = {
  q?: string;
  availability?: string;
  owner?: string;
  category?: string;
  type?: string;
};

export function GuestFilters({
  path,
  values,
  owners,
}: {
  path: string;
  values: Filters;
  owners: Map<string, string>;
}) {
  return (
    <form
      action={`${path}#wishlist`}
      method="get"
      className="panel grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
    >
      <Field id="q" label="Search wishes">
        <input
          className="control"
          type="search"
          name="q"
          maxLength={120}
          defaultValue={values.q}
        />
      </Field>
      <Field id="owner" label="Wishlist owner">
        <select
          className="control"
          name="owner"
          defaultValue={values.owner ?? ""}
        >
          <option value="">All owners</option>
          <option value="shared">Shared</option>
          {Array.from(owners, ([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </Field>
      <Field id="category" label="Category">
        <select
          className="control"
          name="category"
          defaultValue={values.category ?? ""}
        >
          <option value="">All categories</option>
          {wishCategories.map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <Field id="type" label="Wish type">
        <select
          className="control"
          name="type"
          defaultValue={values.type ?? ""}
        >
          <option value="">All types</option>
          {wishTypes.map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <Field id="availability" label="Availability">
        <select
          className="control"
          name="availability"
          defaultValue={values.availability ?? ""}
        >
          <option value="">All wishes</option>
          <option value="available">Available</option>
          <option value="full">Fully committed</option>
        </select>
      </Field>
      <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-5">
        <Button type="submit">Apply filters</Button>
        {Object.values(values).some(Boolean) && (
          <Button variant="outline" asChild>
            <Link href={`${path}#wishlist`}>Clear filters</Link>
          </Button>
        )}
      </div>
    </form>
  );
}
