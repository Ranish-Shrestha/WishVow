import jsQR from "jsqr";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { expect, it, vi } from "vitest";
import { invitationDownload } from "@/lib/services/invitation-renderer";
import {
  invitationCardSchema,
  invitationLinkSchema,
  invitationTemplates,
} from "@/lib/validation/invitations";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/storage", () => ({
  async readStoredImage() {
    const photo = await sharp({
      create: { width: 820, height: 310, channels: 3, background: "#bda585" },
    })
      .webp()
      .toBuffer();
    return new Blob([new Uint8Array(photo)]).stream();
  },
}));

it.each(invitationTemplates)(
  "fits maximum-length invitation text and preserves the QR code in %s",
  async (template) => {
    const card = invitationCardSchema.parse({
      names: "W".repeat(88),
      venue: "W".repeat(120),
      invitationDate: "2027-06-12",
      template,
      accentColor: "#54634b",
      backgroundColor: "#faf6ee",
    });
    const { label } = invitationLinkSchema.parse({
      label: "W".repeat(100),
      maxParty: "2",
    });
    const recipient = {
      label,
      url:
        "https://invitations-wishvow-preview.example.test/invite/" +
        "A".repeat(43),
    };
    const design = { ...card, imageKey: "test-photo" };
    const response = await invitationDownload(
      design,
      "en-CA",
      recipient,
      "png",
    );
    const bytes = Buffer.from(await response.arrayBuffer());
    const { data, info } = await sharp(bytes)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    let inkInMargins = 0;
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        if (
          x >= 100 &&
          x < info.width - 100 &&
          y >= 100 &&
          y < info.height - 100
        )
          continue;
        const pixel = (y * info.width + x) * info.channels;
        if (data[pixel] < 32 && data[pixel + 1] < 32 && data[pixel + 2] < 32) {
          inkInMargins++;
        }
      }
    }
    expect(inkInMargins).toBe(0);
    expect(
      jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data,
    ).toBe(recipient.url);

    const pdf = await invitationDownload(design, "en-CA", recipient, "pdf");
    const pdfBytes = await pdf.arrayBuffer();
    const document = await PDFDocument.load(pdfBytes);
    expect(document.getPageCount()).toBe(1);
    expect(document.getPage(0).getSize()).toEqual({ width: 360, height: 500 });
  },
);
