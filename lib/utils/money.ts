import { moneyDigits } from "@/lib/validation/wishes";

export function displayMoney(amount: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(
    amount / 10 ** moneyDigits(currency),
  );
}

export function amountInput(amount: number | null, currency: string) {
  return amount === null
    ? ""
    : (amount / 10 ** moneyDigits(currency)).toFixed(moneyDigits(currency));
}
