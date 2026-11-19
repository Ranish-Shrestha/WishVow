import { randomUUID } from "node:crypto";
import { expect, type Page } from "@playwright/test";
import { receivedMail } from "./mail";

export function mailLink(text: string) {
  const link = text.match(/https?:\/\/[^\s]+/)?.[0];
  if (!link) throw new Error("Test email had no link.");
  return link;
}

export async function verifyHostFulfilment(
  host: Page,
  guest: Page,
  wishUrl: string,
  eventUrl: string,
) {
  const email = "giver-" + randomUUID() + "@example.test";
  await guest.getByLabel("Your name").fill("Surprise Giver");
  await guest.getByLabel("Email address").fill(email);
  await guest
    .getByText("Allow my name to appear if the host enables guest names")
    .click();
  await guest.getByRole("button", { name: "Send confirmation link" }).click();
  await expect(
    guest.getByText(/Check your inbox for the next step/),
  ).toBeVisible();
  const verification = await receivedMail(
    email,
    "Confirm your WishVow commitment",
  );
  await guest.goto(mailLink(verification.text));
  await guest.getByRole("button", { name: "Confirm commitment" }).click();
  await expect(guest.getByText("Your commitment is confirmed.")).toBeVisible();
  const management = guest.url();

  await guest.goto(wishUrl);
  await expect(guest.getByText("Surprise Giver")).toHaveCount(0);
  await host.goto(eventUrl);
  await host.getByRole("link", { name: "Commitments", exact: true }).click();
  await expect(
    host.getByRole("heading", { name: "Commitments" }),
  ).toBeVisible();
  expect(
    await host.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await host
    .getByLabel("Status", { exact: true })
    .selectOption("pending_verification");
  await host.getByRole("button", { name: "Apply filters" }).focus();
  await host.keyboard.press("Enter");
  await expect(
    host.getByRole("heading", { name: "No matching commitments" }),
  ).toBeVisible();
  await host.getByRole("link", { name: "Clear filters" }).click();
  const active = host
    .getByRole("listitem")
    .filter({ has: host.getByRole("button", { name: "Mark purchased" }) });
  await expect(active.getByText("Guest details hidden")).toBeVisible();
  await expect(host.getByText(email)).toHaveCount(0);
  await active.getByRole("button", { name: "Mark purchased" }).click();
  await active.getByRole("button", { name: "Mark purchased" }).click();

  const purchased = host.getByRole("listitem").filter({ hasText: "Purchased" });
  await expect(purchased.getByText("Guest details hidden")).toBeVisible();
  await purchased.getByRole("button", { name: "Mark fulfilled" }).click();
  await purchased.getByLabel("Host note (optional)").fill("Gift arrived.");
  await purchased.getByRole("button", { name: "Mark fulfilled" }).click();
  const fulfilled = host
    .getByRole("listitem")
    .filter({ hasText: "Gift arrived." });
  await expect(fulfilled.getByText(email)).toBeVisible();
  await guest.goto(wishUrl);
  await expect(guest.getByText("Surprise Giver")).toBeVisible();
  await guest.goto(management);
  await expect(
    guest.getByRole("button", { name: "Cancel commitment" }),
  ).toHaveCount(0);
  await guest.goto(wishUrl);
  await host.getByRole("link", { name: "Back to event" }).click();
}
