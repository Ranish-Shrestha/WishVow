import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import jsQR from "jsqr";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";

export async function verifyInvitationFlow(
  host: Page,
  guest: Page,
  eventUrl: string,
) {
  await host.getByRole("link", { name: "Invitations & RSVPs" }).click();
  await host.getByLabel("Invitation names").fill("Alex & Jules");
  await host.getByLabel("Invitation date").fill("2027-06-12");
  await host.getByLabel("Venue").fill("Lake House, Toronto");
  await host.getByLabel("Template").selectOption("garden");
  await host.getByLabel("Accent color").fill("#5c7054");
  await host.getByLabel("Background color").fill("#f4f1e7");
  const photo = await sharp({
    create: { width: 400, height: 260, channels: 3, background: "#c5ae90" },
  })
    .png()
    .toBuffer();
  await host
    .getByLabel("Invitation photo (optional)")
    .setInputFiles({ name: "lake.png", mimeType: "image/png", buffer: photo });
  await host.getByRole("button", { name: "Save design" }).click();
  await expect(host.getByText("Invitation design saved.")).toBeVisible();
  const previewPath = (await host
    .getByAltText("Preview of the saved invitation design")
    .getAttribute("src"))!;
  expect(
    (await host.request.get(previewPath)).headers()["content-type"],
  ).toContain("image/png");

  await host.getByLabel("Household label").fill("Rivera household");
  await host.getByLabel("Maximum party size").fill("2");
  await host.getByRole("button", { name: "Create invitation link" }).click();
  const row = host
    .getByRole("listitem")
    .filter({ has: host.getByRole("heading", { name: "Rivera household" }) });
  await expect(row.getByText("Awaiting reply")).toBeVisible();
  await row.getByText("Share or download").click();
  const url = await row
    .getByLabel("Private link for Rivera household")
    .inputValue();
  expect(url).toMatch(/\/invite\/[A-Za-z0-9_-]{43}$/);

  const pngPath = (await row
    .getByRole("link", { name: "Download PNG" })
    .getAttribute("href"))!;
  const png = await host.request.get(pngPath);
  expect(png.status()).toBe(200);
  const pngBytes = await png.body();
  const { data, info } = await sharp(pngBytes)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  expect([info.width, info.height]).toEqual([1080, 1500]);
  expect(jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data).toBe(
    url,
  );
  const pdfPath = (await row
    .getByRole("link", { name: "Download PDF" })
    .getAttribute("href"))!;
  const pdf = await host.request.get(pdfPath);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
  const pdfBytes = await pdf.body();
  const pdfDoc = await PDFDocument.load(pdfBytes);
  expect(pdfDoc.getPageCount()).toBe(1);
  expect(pdfDoc.getPage(0).getSize()).toEqual({ width: 360, height: 500 });
  const artifact = test.info().outputPath("invitation.pdf");
  await mkdir(dirname(artifact), { recursive: true });
  await writeFile(artifact, pdfBytes);

  await guest.context().clearCookies();
  const invitation = await guest.goto(url);
  expect(invitation?.headers()["cache-control"]).toContain("no-store");
  expect(invitation?.headers()["referrer-policy"]).toBe("no-referrer");
  await expect(
    guest.getByRole("heading", { name: "Alex & Jules" }),
  ).toBeVisible();
  await expect(guest.getByText("Lake House, Toronto")).toBeVisible();
  expect((await guest.request.get(url + "/photo")).status()).toBe(200);
  expect(
    await guest.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await guest.getByRole("link", { name: "View the wishlist" }).click();
  await expect(
    guest.getByRole("heading", { name: "This wishlist is private" }),
  ).toBeVisible();
  await guest.goto(url);

  await guest.getByLabel("Will you attend?").selectOption("attending");
  await guest.getByLabel("Party size, including you").fill("2");
  await guest.getByLabel("Message for the host (optional)").fill("=SUM(1,2)");
  await guest.getByRole("button", { name: "Save RSVP" }).click();
  await expect(guest.getByText("Your RSVP was saved.")).toBeVisible();
  await host.reload();
  await expect(row.getByText("Attending · 2 of 2")).toBeVisible();

  const csvPath = (await host
    .getByRole("link", { name: "Download RSVP CSV" })
    .getAttribute("href"))!;
  expect(
    (await guest.request.get(new URL(csvPath, eventUrl).href)).status(),
  ).toBe(404);
  const csv = await (await host.request.get(csvPath)).text();
  expect(csv).toContain('"Rivera household","Active","Attending","2","2"');
  expect(csv).toContain("'=SUM(1,2)");
  expect(csv).not.toContain(url);

  await row.getByRole("button", { name: "Rotate link" }).click();
  await row.getByRole("button", { name: "Confirm new link" }).click();
  await expect(row.getByText("New invitation link created.")).toBeVisible();
  await row.getByText("Share or download").click();
  const rotated = await row
    .getByLabel("Private link for Rivera household")
    .inputValue();
  expect(rotated).not.toBe(url);
  expect((await guest.request.get(url + "/photo")).status()).toBe(404);
  await guest.goto(rotated);
  await expect(guest.getByLabel("Will you attend?")).toHaveValue("attending");
  await guest.getByLabel("Will you attend?").selectOption("not_attending");
  await guest.getByRole("button", { name: "Save RSVP" }).click();
  await expect(guest.getByText("Your RSVP was saved.")).toBeVisible();

  await host.reload();
  await expect(row.getByText("Not attending", { exact: true })).toBeVisible();
  await row.getByRole("button", { name: "Revoke link" }).click();
  await row.getByRole("button", { name: "Confirm revoke" }).click();
  await expect(row.getByText("Revoked · Not attending")).toBeVisible();
  expect((await guest.request.get(rotated + "/photo")).status()).toBe(404);
  await guest.goto(rotated);
  await expect(
    guest.getByRole("heading", { name: "Page unavailable" }),
  ).toBeVisible();
  await host.getByRole("link", { name: "Back to event" }).click();
}
