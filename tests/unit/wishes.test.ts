import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { prepareImage } from "@/lib/storage/prepare-image";
import { parseMinor, wishSchema } from "@/lib/validation/wishes";

vi.mock("server-only", () => ({}));

const base = {
  title: "Honeymoon",
  description: "",
  notes: "",
  type: "physical",
  category: "other",
  participantId: "",
  isVisible: true,
  priority: "normal",
  externalUrl: "",
  deadline: "",
  quantity: "",
  target: "",
  minimum: "",
  suggested: "",
  currency: "CAD",
  allowMultipleCommitments: false,
};

describe("wish validation", () => {
  it("applies capacity defaults for physical gifts, services, and open wishes", () => {
    expect(wishSchema.parse(base)).toMatchObject({
      quantityTotal: 1,
      currency: null,
    });
    expect(
      wishSchema.parse({
        ...base,
        type: "service",
        description: "Photograph the ceremony",
      }),
    ).toMatchObject({ quantityTotal: null });
    expect(wishSchema.parse({ ...base, type: "open_wish" })).toMatchObject({
      quantityTotal: 1,
      allowMultipleCommitments: false,
    });
    expect(
      wishSchema.parse({
        ...base,
        type: "open_wish",
        allowMultipleCommitments: true,
      }),
    ).toMatchObject({ quantityTotal: null, allowMultipleCommitments: true });
    expect(
      wishSchema.parse({
        ...base,
        type: "open_wish",
        quantity: "4",
        allowMultipleCommitments: true,
      }),
    ).toMatchObject({ quantityTotal: 4, allowMultipleCommitments: false });
  });

  it("stores integer minor units at the selected currency precision", () => {
    expect(parseMinor("129.99", "CAD")).toBe(12999);
    expect(parseMinor("129.5", "CAD")).toBe(12950);
    expect(parseMinor("129.999", "KWD")).toBe(129999);
    expect(parseMinor("129.01", "JPY")).toBeNull();
    expect(parseMinor("21474836.48", "CAD")).toBeNull();
    expect(
      wishSchema.parse({
        ...base,
        type: "group_fund",
        target: "5000.25",
        minimum: "12.05",
      }),
    ).toMatchObject({
      targetAmountMinor: 500025,
      minimumAmountMinor: 1205,
      quantityTotal: null,
    });
  });

  it.each([
    { type: "group_fund" },
    { type: "group_fund", target: "10", minimum: "11" },
    { type: "service" },
    { quantity: "0" },
    { currency: "XXX" },
    { externalUrl: "javascript:alert(1)" },
    { externalUrl: "https://user:secret@example.com" },
    { externalUrl: "not a url" },
  ])("rejects invalid inputs %j", (invalid) => {
    expect(wishSchema.safeParse({ ...base, ...invalid }).success).toBe(false);
  });
});

it("re-encodes genuine still images and rejects spoofed image types", async () => {
  const original = await sharp({
    create: { width: 1800, height: 200, channels: 3, background: "#ded2be" },
  })
    .png()
    .toBuffer();
  const prepared = await prepareImage(
    new File([new Uint8Array(original)], "wish.png", { type: "image/png" }),
  );
  expect(prepared).not.toBeNull();
  expect(await sharp(prepared!).metadata()).toMatchObject({
    format: "webp",
    width: 1600,
  });
  expect(
    await prepareImage(
      new File([new Uint8Array(original)], "wish.jpg", { type: "image/jpeg" }),
    ),
  ).toBeNull();
  expect(
    await prepareImage(new File(["<svg/>"], "wish.png", { type: "image/png" })),
  ).toBeNull();
});
