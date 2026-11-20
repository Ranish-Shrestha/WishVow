const cityOverrides: Readonly<Record<string, string>> = {
  "Europe/London": "London (U.K.)",
};

export function timeZoneOptions(timeZones: readonly string[]) {
  const cities = timeZones.map((value) => {
    const parts = value.split("/");
    const city = parts.pop()!.replaceAll("_", " ");
    return { value, city, region: parts.join(", ").replaceAll("_", " ") };
  });
  const cityCounts = new Map<string, number>();
  for (const { city } of cities) {
    cityCounts.set(city, (cityCounts.get(city) ?? 0) + 1);
  }

  const byLabel = new Intl.Collator("en");
  return cities
    .map(({ value, city, region }) => ({
      value,
      label:
        cityOverrides[value] ??
        (region && (cityCounts.get(city) ?? 0) > 1
          ? `${city} (${region})`
          : city),
    }))
    .sort((a, b) => {
      if (a.value === "UTC") return -1;
      if (b.value === "UTC") return 1;
      return byLabel.compare(a.label, b.label);
    });
}
