import "server-only";

import { ImageResponse } from "next/og";
import { PDFDocument } from "pdf-lib";
import QRCode from "qrcode";
import sharp from "sharp";
import { readStoredImage } from "@/lib/storage";
import {
  invitationDate,
  invitationInk,
  type InvitationDesign,
} from "./invitation-design";

const width = 1080;
const height = 1500;
const qrSize = 220;
const headers = {
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow",
};

async function photoDataUrl(key: string | null) {
  if (!key) return null;
  const stored = await readStoredImage(key);
  if (!stored) throw new Error("Invitation photo could not be loaded.");
  const bytes = Buffer.from(await new Response(stored).arrayBuffer());
  const photo = await sharp(bytes).resize(820, 310).png().toBuffer();
  return `data:image/png;base64,${photo.toString("base64")}`;
}

export async function invitationPng(
  design: InvitationDesign,
  locale: string,
  recipient?: { label: string; url: string },
) {
  const [photo, qr] = await Promise.all([
    photoDataUrl(design.imageKey),
    recipient
      ? QRCode.toDataURL(recipient.url, {
          width: qrSize * 2,
          margin: 4,
          errorCorrectionLevel: "M",
        })
      : null,
  ]);
  const { backgroundColor, accentColor, template } = design;
  const modern = template === "modern";
  const garden = template === "garden";
  const fontSize = Math.max(
    46,
    90 - Math.max(0, Array.from(design.names).length - 26) * 0.72,
  );
  const venueFont = Math.max(
    24,
    32 - Math.max(0, design.venue.length - 62) / 7,
  );
  const ink = invitationInk(backgroundColor);

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width,
        height,
        padding: 68,
        backgroundColor,
        color: ink,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: modern ? "flex-start" : "center",
          justifyContent: "center",
          textAlign: modern ? "left" : "center",
          width: "100%",
          height: "100%",
          padding: "48px 62px",
          border: `3px solid ${accentColor}`,
          borderTopWidth: modern ? 26 : 3,
          borderRadius: garden ? "260px 260px 24px 24px" : modern ? 0 : 14,
        }}
      >
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element -- ImageResponse accepts native img elements.
          <img
            src={photo}
            alt=""
            width={776}
            height={294}
            style={{
              objectFit: "cover",
              marginBottom: 34,
              borderRadius: garden ? "124px 124px 14px 14px" : 10,
            }}
          />
        )}
        <div
          style={{
            display: "flex",
            marginBottom: 16,
            fontSize: 29,
            letterSpacing: 5,
          }}
        >
          YOU ARE INVITED
        </div>
        <div
          style={{
            display: "flex",
            fontSize,
            fontWeight: 700,
            lineHeight: 1.11,
            wordBreak: "break-word",
            width: "100%",
            justifyContent: modern ? "flex-start" : "center",
          }}
        >
          {design.names}
        </div>
        <div
          style={{
            display: "flex",
            width: modern ? 88 : 150,
            backgroundColor: accentColor,
            height: 4,
            marginTop: 30,
            marginBottom: 26,
          }}
        />
        <div style={{ display: "flex", fontSize: 37, marginBottom: 10 }}>
          {invitationDate(design.invitationDate, locale)}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: venueFont,
            lineHeight: 1.25,
            wordBreak: "break-word",
            width: "100%",
            justifyContent: modern ? "flex-start" : "center",
          }}
        >
          {design.venue}
        </div>
        {recipient && qr && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: 38,
              gap: 26,
              width: "100%",
              justifyContent: modern ? "flex-start" : "center",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse accepts native img elements. */}
            <img src={qr} alt="" width={qrSize} height={qrSize} />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                textAlign: "left",
                width: 360,
                gap: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 22,
                  lineHeight: 1.23,
                  wordBreak: "break-word",
                }}
              >
                For {recipient.label}
              </div>
              <div style={{ display: "flex", fontSize: 29, fontWeight: 700 }}>
                Scan to RSVP
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    { width, height, headers },
  );
}

export async function invitationDownload(
  design: InvitationDesign,
  locale: string,
  recipient: { label: string; url: string },
  format: "png" | "pdf",
) {
  const png = await invitationPng(design, locale, recipient);
  if (format === "png") {
    png.headers.set(
      "Content-Disposition",
      'attachment; filename="wishvow-invitation.png"',
    );
    return png;
  }
  const pdf = await PDFDocument.create();
  pdf.setTitle("WishVow invitation");
  const artwork = await pdf.embedPng(await png.arrayBuffer());
  const page = pdf.addPage([360, 500]);
  page.drawImage(artwork, { x: 0, y: 0, width: 360, height: 500 });
  const bytes = new Uint8Array(await pdf.save());
  return new Response(bytes, {
    headers: {
      ...headers,
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="wishvow-invitation.pdf"',
    },
  });
}
