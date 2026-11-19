import { z } from "zod";

export const wishTypes = [
  ["physical", "Physical gift"],
  ["experience", "Experience"],
  ["group_fund", "Group fund"],
  ["service", "Service"],
  ["open_wish", "Open wish"],
] as const;
export const wishCategories = [
  ["home", "Home"],
  ["travel", "Travel"],
  ["celebration", "Celebration"],
  ["experiences", "Experiences"],
  ["services", "Services"],
  ["other", "Other"],
] as const;
export const wishTypeValues = [
  "physical",
  "experience",
  "group_fund",
  "service",
  "open_wish",
] as const;
export const wishCategoryValues = [
  "home",
  "travel",
  "celebration",
  "experiences",
  "services",
  "other",
] as const;
export const maxWishesPerEvent = 200;
export const maxImageBytes = 4 * 1024 * 1024;
export const imageTypes = ["image/jpeg", "image/png", "image/webp"] as const;

const currencies = new Set(Intl.supportedValuesOf("currency"));
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null);
const isoCurrency = z
  .string()
  .trim()
  .toUpperCase()
  .refine(
    (value) => currencies.has(value),
    "Enter an ISO currency code such as CAD.",
  );

export function moneyDigits(currency: string) {
  return (
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
    }).resolvedOptions().maximumFractionDigits ?? 2
  );
}

export function parseMinor(value: string, currency: string) {
  const digits = moneyDigits(currency);
  const match = /^(\d{1,10})(?:\.(\d{1,3}))?$/.exec(value);
  if (!match || (match[2]?.length ?? 0) > digits) return null;
  const amount =
    Number(match[1]) * 10 ** digits +
    Number((match[2] ?? "").padEnd(digits, "0"));
  return amount > 0 && amount <= 2_147_483_647 ? amount : null;
}

const wishFields = z.object({
  title: z.string().trim().min(1, "Enter a wish title.").max(120),
  description: optionalText(4000),
  notes: optionalText(1500),
  type: z.enum(wishTypeValues),
  category: z.enum(wishCategoryValues),
  participantId: z
    .union([z.literal(""), z.uuid()])
    .transform((value) => value || null),
  priority: z.enum(["normal", "favorite"]),
  isVisible: z.boolean(),
  externalUrl: z
    .union([z.literal(""), z.url({ protocol: /^https?$/ })])
    .transform((value) => value || null)
    .refine(
      (value) =>
        !value ||
        (value.length <= 2048 &&
          !new URL(value).username &&
          !new URL(value).password),
      "Use an HTTP or HTTPS link without credentials.",
    ),
  deadline: z
    .union([z.literal(""), z.iso.date()])
    .transform((value) => value || null),
  quantity: z
    .string()
    .trim()
    .regex(/^(?:[1-9]\d{0,2})?$/, "Use a whole number between 1 and 999."),
  target: z.string().trim().max(16),
  minimum: z.string().trim().max(16),
  suggested: z.string().trim().max(16),
  currency: isoCurrency,
  allowMultipleCommitments: z.boolean(),
});

export const wishSchema = wishFields.transform((input, context) => {
  const {
    quantity,
    target,
    minimum,
    suggested,
    currency,
    allowMultipleCommitments,
    ...fields
  } = input;
  const isFund = fields.type === "group_fund";
  const isOpen = fields.type === "open_wish";
  const isService = fields.type === "service";
  const allowsEstimate =
    fields.type === "physical" || fields.type === "experience";
  const targetAmountMinor =
    isFund && target ? parseMinor(target, currency) : null;
  const minimumAmountMinor =
    isFund && minimum ? parseMinor(minimum, currency) : null;
  const suggestedAmountMinor =
    allowsEstimate && suggested ? parseMinor(suggested, currency) : null;
  const amountMessage =
    "Enter a positive amount using this currency’s precision.";
  if (isFund && !targetAmountMinor)
    context.addIssue({
      code: "custom",
      path: ["target"],
      message: amountMessage,
    });
  if (
    isFund &&
    minimum &&
    (!minimumAmountMinor ||
      (targetAmountMinor && minimumAmountMinor > targetAmountMinor))
  ) {
    context.addIssue({
      code: "custom",
      path: ["minimum"],
      message: "Enter a positive minimum no greater than the goal.",
    });
  }
  if (allowsEstimate && suggested && !suggestedAmountMinor)
    context.addIssue({
      code: "custom",
      path: ["suggested"],
      message: amountMessage,
    });
  if (isService && !fields.description)
    context.addIssue({
      code: "custom",
      path: ["description"],
      message: "Describe the service you’re asking for.",
    });
  const unlimited = isOpen && !quantity && allowMultipleCommitments;
  return {
    ...fields,
    allowMultipleCommitments: unlimited,
    quantityTotal:
      !isFund && quantity
        ? Number(quantity)
        : isFund || isService || unlimited
          ? null
          : 1,
    currency: isFund || suggestedAmountMinor ? currency : null,
    targetAmountMinor,
    minimumAmountMinor,
    suggestedAmountMinor,
  };
});

export type WishInput = z.infer<typeof wishSchema>;
export type WishType = WishInput["type"];
export const eventSlugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*-[a-f0-9]{24}$/)
  .max(73);
