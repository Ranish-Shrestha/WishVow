import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { receivedMail } from "./mail";
import { mailLink, verifyHostFulfilment } from "./host-fulfilment";
import { verifyInvitationFlow } from "./invitation-flow";

test("hosts can sign in, configure and publish an event, and archive it", async ({
  page,
  context,
  browser,
}) => {
  const email = `host-${randomUUID()}@example.com`;
  const password = "test password for WishVow";
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Make their wishes come true." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/sign-in$/);

  await page.getByRole("link", { name: "Create an account" }).click();
  await page.getByLabel("Your name").fill("Alex");
  await page.getByLabel("Email address").fill(email);
  const passwordInput = page.getByLabel("Password", { exact: true });
  const confirmation = page.getByLabel("Confirm password", { exact: true });
  await passwordInput.fill(password);
  await expect(passwordInput).toHaveAttribute("type", "password");
  const showPassword = page.getByRole("button", {
    name: "Show password",
    exact: true,
  });
  await showPassword.focus();
  await showPassword.press("Space");
  await expect(passwordInput).toHaveAttribute("type", "text");
  await expect(passwordInput).toHaveValue(password);
  await page
    .getByRole("button", { name: "Hide password", exact: true })
    .click();
  await expect(passwordInput).toHaveAttribute("type", "password");
  const mismatchedPassword = "a different test password";
  await confirmation.fill(mismatchedPassword);
  await expect(page.getByText("The passwords must match.")).toBeVisible();
  await page
    .getByRole("button", { name: "Show password confirmation" })
    .click();
  await expect(confirmation).toHaveAttribute("type", "text");
  await expect(confirmation).toHaveValue(mismatchedPassword);
  await expect(passwordInput).toHaveAttribute("type", "password");
  await page
    .getByRole("button", { name: "Hide password confirmation" })
    .click();
  await expect(confirmation).toHaveAttribute("type", "password");
  const createAccount = page.getByRole("button", { name: "Create account" });
  await createAccount.click();
  await expect(page.getByText("The passwords must match.")).toBeVisible();
  await expect(confirmation).toHaveAttribute("aria-invalid", "true");
  const mismatchedRequest = await page.request.post("/api/auth/sign-up/email", {
    headers: { origin: new URL(page.url()).origin },
    data: {
      name: "Alex",
      email,
      password,
      confirmPassword: mismatchedPassword,
    },
  });
  expect(mismatchedRequest.status()).toBe(400);
  expect(await mismatchedRequest.json()).toMatchObject({
    message: "Invalid credentials.",
  });
  await confirmation.fill(password);
  await expect(page.getByText("The passwords must match.")).toBeHidden();
  await createAccount.click();
  await expect(
    page.getByText("Check your inbox for a link to verify your host email."),
  ).toBeVisible();
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in$/);
  const hostVerification = await receivedMail(
    email,
    "Verify your WishVow host account",
  );
  await page.goto(mailLink(hostVerification.text));
  await expect(page.getByText(/Your host email is verified/)).toBeVisible();
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "My events" })).toBeVisible();

  await page.getByRole("link", { name: "New event" }).click();
  await page.getByLabel("Event title").fill("Alex & Jules");
  await page.getByLabel("Event type").selectOption({ label: "Birthday" });
  await expect(page.getByLabel("Locale", { exact: true })).toHaveCount(0);
  const timeZone = page.getByRole("combobox", { name: "Time zone" });
  await expect(timeZone).toHaveValue("America/Toronto");
  await timeZone.evaluate((select) => {
    (select as HTMLSelectElement).add(new Option("Invalid", "America/Nowhere"));
  });
  await timeZone.selectOption("America/Nowhere");
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(
    page.getByText("Choose a valid time zone.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Event title")).toHaveValue("Alex & Jules");
  await expect(page.getByLabel("Event type")).toHaveValue("birthday");
  await timeZone.selectOption("Asia/Kathmandu");
  await page.getByLabel("Guest access").selectOption("passcode");
  await page.getByLabel("Event passcode").fill("only our guests");
  await page.getByLabel(/Allow consenting givers/).check();
  await page.getByLabel(/Hide giver details until fulfilment/).check();
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(
    page.getByRole("heading", { name: "Alex & Jules" }),
  ).toBeVisible();
  await expect(page.getByText("Draft · Passcode protected")).toBeVisible();
  await expect(page.getByText("Birthday", { exact: true })).toBeVisible();
  const eventUrl = page.url();

  const participantForm = page.getByRole("form", { name: "New participant" });
  await participantForm.getByLabel("Participant name").fill("Jules");
  await participantForm.getByLabel("Role label").fill("Partner");
  await participantForm
    .getByRole("button", { name: "Add participant" })
    .click();
  const editParticipant = page.getByRole("form", { name: "Edit Jules" });
  await expect(editParticipant.getByLabel("Participant name")).toHaveValue(
    "Jules",
  );
  await editParticipant.getByLabel("Role label").fill("Co-organizer");
  await editParticipant
    .getByRole("button", { name: "Save participant" })
    .click();
  await expect(editParticipant.getByText("Participant saved.")).toBeVisible();

  await page.getByRole("link", { name: "Edit event" }).click();
  await expect(page.getByLabel("Locale", { exact: true })).toHaveCount(0);
  await expect(timeZone).toHaveValue("Asia/Kathmandu");
  await expect(page.getByLabel("Event type")).toHaveValue("birthday");
  await page.getByLabel("Event type").selectOption({ label: "Anniversary" });
  await page.getByLabel("Event title").fill("Alex & Jules Anniversary");
  await expect(page.getByLabel("Event passcode")).toHaveValue("");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByRole("heading", { name: "Alex & Jules Anniversary" }),
  ).toBeVisible();
  await expect(page.getByText("Anniversary", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Publish event" }).click();
  await expect(
    page.getByText("Add at least one visible wish before publishing."),
  ).toBeVisible();

  await page.getByRole("link", { name: "Manage wishlist" }).click();
  await page.getByRole("link", { name: "New wish" }).click();
  await page.getByLabel("Wish title").fill("Ceramic tea set");
  await page.getByLabel("Category").selectOption("home");
  const png = await sharp({
    create: { width: 32, height: 24, channels: 3, background: "#c5ac8a" },
  })
    .png()
    .toBuffer();
  await page
    .getByLabel("Wish image (optional)")
    .setInputFiles({ name: "tea.png", mimeType: "image/png", buffer: png });
  await page.getByRole("button", { name: "Add wish" }).click();
  await expect(
    page.getByRole("heading", { name: "Ceramic tea set" }),
  ).toBeVisible();
  const giftEditPath = (await page
    .getByRole("link", { name: "Edit wish" })
    .getAttribute("href"))!;
  const wishId = giftEditPath.split("/").at(-2);
  expect(wishId).toBeTruthy();

  await page.getByRole("link", { name: "New wish" }).click();
  await page.getByLabel("Wish title").fill("Japan honeymoon");
  await page.getByLabel("Wish type").selectOption("group_fund");
  await page
    .getByLabel("Wishlist owner")
    .selectOption({ label: "Jules · Co-organizer" });
  await page.getByLabel("Category").selectOption("travel");
  await page.getByLabel("Fund goal").fill("5000");
  await page.getByRole("button", { name: "Add wish" }).click();
  const fund = page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: "Japan honeymoon" }) });
  await expect(fund).toBeVisible();
  await fund.getByRole("button", { name: "Move up" }).click();
  await expect(page.getByRole("heading", { level: 2 }).first()).toHaveText(
    "Japan honeymoon",
  );
  await fund.getByRole("link", { name: "Edit wish" }).click();
  await page.getByLabel("Minimum pledge (optional)").fill("10");
  await page.getByRole("button", { name: "Save wish" }).click();
  await expect(
    page.getByRole("heading", { name: "Manage wishlist" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Back to event" }).click();
  await page.getByRole("link", { name: "Preview guest wishlist" }).click();
  await expect(page.getByText("Private host preview")).toBeVisible();
  await page.getByRole("link", { name: "Ceramic tea set" }).click();
  await expect(
    page.getByRole("heading", { name: "Ceramic tea set" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Back to wishlist" }).click();
  await page.getByRole("link", { name: "Back to event" }).click();
  await page.getByRole("button", { name: "Publish event" }).click();
  await expect(page.getByLabel("Event share link")).toHaveValue(
    /\/e\/alex-jules-[a-f0-9]{24}$/,
  );
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Copy link" }).click();
  await expect(page.getByText("Link copied.")).toBeVisible();
  const share = await page.getByLabel("Event share link").inputValue();
  const guestContext = await browser.newContext({
    viewport: page.viewportSize() ?? undefined,
  });
  try {
    const guest = await guestContext.newPage();
    await verifyInvitationFlow(page, guest, eventUrl);
    const wishUrl = share + "/wishes/" + wishId;
    await guest.goto(share);
    await expect(
      guest.getByRole("heading", { name: "This wishlist is private" }),
    ).toBeVisible();
    await expect(guest.getByText("Alex & Jules Anniversary")).toHaveCount(0);
    expect((await guest.request.get(wishUrl + "/image")).status()).toBe(404);
    await guest.getByLabel("Event passcode").fill("wrong passcode");
    await guest.getByRole("button", { name: "Unlock wishlist" }).click();
    await expect(
      guest.getByRole("alert").filter({ hasText: "That passcode" }),
    ).toBeVisible();
    await guest.getByLabel("Event passcode").fill("only our guests");
    await guest.getByRole("button", { name: "Unlock wishlist" }).click();
    await expect(
      guest.getByRole("heading", { name: "Alex & Jules Anniversary" }),
    ).toBeVisible();
    await expect(guest.getByText("Anniversary", { exact: true })).toBeVisible();
    await expect(
      guest.getByRole("heading", { name: "Shared wishes" }),
    ).toBeVisible();
    await expect(
      guest.getByRole("heading", { name: "Jules", exact: true }),
    ).toBeVisible();
    await guest.getByLabel("Wishlist owner").selectOption({ label: "Jules" });
    await guest.getByLabel("Category").selectOption("travel");
    await guest.getByRole("button", { name: "Apply filters" }).click();
    await expect(
      guest.getByRole("link", { name: "Japan honeymoon" }),
    ).toBeVisible();
    await expect(
      guest.getByRole("link", { name: "Ceramic tea set" }),
    ).toHaveCount(0);
    await guest.getByRole("link", { name: "Japan honeymoon" }).click();
    await expect(
      guest.getByText("$0.00 pledged of $5,000.00 goal"),
    ).toBeVisible();
    await expect(guest.getByText("Minimum pledge $10.00")).toBeVisible();
    await guest.goto(wishUrl);
    await expect(
      guest.getByRole("heading", { name: "Ceramic tea set" }),
    ).toBeVisible();
    const photo = await guest.request.get(wishUrl + "/image");
    expect(photo.status()).toBe(200);
    expect(photo.headers()["content-type"]).toBe("image/webp");
    expect(photo.headers()["cache-control"]).toContain("no-store");
    expect(
      await guest.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
    const guestEmail = "guest-" + randomUUID() + "@example.test";
    await guest.getByLabel("Your name").fill("Wedding guest");
    await guest.getByLabel("Email address").fill(guestEmail);
    await guest.getByRole("button", { name: "Send confirmation link" }).click();
    await expect(
      guest.getByText(/Check your inbox for the next step/),
    ).toBeVisible();
    const verification = await receivedMail(
      guestEmail,
      "Confirm your WishVow commitment",
    );
    const verifyUrl = verification.text.match(/https?:\/\/[^\s]+/)?.[0];
    expect(verifyUrl).toBeTruthy();
    await guestContext.request.get(verifyUrl!);
    const stillAvailable = await guestContext.newPage();
    await stillAvailable.goto(wishUrl);
    await expect(stillAvailable.getByText("1 available")).toBeVisible();
    await stillAvailable.close();
    await guest.goto(verifyUrl!);
    await guest.getByRole("button", { name: "Confirm commitment" }).click();
    await expect(
      guest.getByText("Your commitment is confirmed."),
    ).toBeVisible();
    const manageUrl = guest.url();
    const confirmation = await receivedMail(
      guestEmail,
      "Your WishVow commitment is confirmed",
    );
    expect(confirmation.text).toContain(manageUrl.split("?")[0]);
    await guest.goto(verifyUrl!);
    await expect(
      guest.getByRole("heading", { name: "Verification link unavailable" }),
    ).toBeVisible();
    await guest.goto(wishUrl);
    await expect(guest.getByText("Fully committed")).toBeVisible();

    await page.getByRole("link", { name: "Manage wishlist" }).click();
    await expect(page.getByText("1 reserved")).toBeVisible();
    await page.getByRole("link", { name: "Back to event" }).click();

    await guest.goto(manageUrl);
    await guest
      .getByLabel("Message for the host (optional)")
      .fill("I will bring it to the reception.");
    await guest.getByRole("button", { name: "Save changes" }).click();
    await expect(guest.getByText("Your changes were saved.")).toBeVisible();
    await guest.getByRole("button", { name: "Cancel commitment" }).click();
    await guest.getByRole("button", { name: "Confirm cancellation" }).click();
    await expect(
      guest.getByText("Your commitment was cancelled."),
    ).toBeVisible();
    await receivedMail(guestEmail, "Your WishVow commitment was cancelled");
    await guest.goto(wishUrl);
    await expect(guest.getByText("1 available")).toBeVisible();
    await verifyHostFulfilment(page, guest, wishUrl, eventUrl);

    await page.getByRole("link", { name: "Edit event" }).click();
    await page.getByLabel("Event passcode").fill("updated invite code");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByLabel("Event share link")).toBeVisible();
    await guest.reload();
    await expect(
      guest.getByRole("heading", { name: "This wishlist is private" }),
    ).toBeVisible();
    expect((await guest.request.get(wishUrl + "/image")).status()).toBe(404);

    await page.getByRole("link", { name: "Edit event" }).click();
    await page.getByLabel("Guest access").selectOption("unlisted");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Published · Unlisted link")).toBeVisible();
    await guest.goto(share);
    await expect(
      guest.getByRole("heading", { name: "Alex & Jules Anniversary" }),
    ).toBeVisible();
  } finally {
    await guestContext.close();
  }

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.goto(eventUrl);
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await page.getByLabel("Host email address").fill(email);
  await page.getByRole("button", { name: "Send password reset link" }).click();
  await expect(page.getByText(/check your inbox for a link/)).toBeVisible();
  const resetMessage = await receivedMail(email, "Reset your WishVow password");
  const nextPassword = "updated test password for WishVow";
  await page.goto(mailLink(resetMessage.text));
  await page.getByLabel("New password", { exact: true }).fill(nextPassword);
  await page.getByLabel("Confirm new password").fill(mismatchedPassword);
  await page.getByRole("button", { name: "Set new password" }).click();
  await expect(page.getByText("The passwords must match.")).toBeVisible();
  await page.getByLabel("Confirm new password").fill(nextPassword);
  await page.getByRole("button", { name: "Set new password" }).click();
  await expect(page.getByText("Your password was updated.")).toBeVisible();
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(nextPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "My events" })).toBeVisible();
  await page.getByRole("link", { name: "Alex & Jules Anniversary" }).click();

  await page.getByRole("button", { name: "Archive event" }).click();
  await page.getByRole("button", { name: "Confirm archive" }).click();
  await expect(page.getByText("Archived · Unlisted link")).toBeVisible();
  await expect(page.getByLabel("Event share link")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Edit event" })).toHaveCount(0);
  await expect(page.getByText("Jules · Co-organizer")).toBeVisible();
  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflows).toBe(false);
  const revoked = await page.request.get(
    share + "/wishes/" + wishId + "/image",
  );
  expect(revoked.status()).toBe(404);
});
