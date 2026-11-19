import { AccountEmailForm } from "@/components/ui/account-email-form";

export const metadata = { title: "Verify host email" };
export default function VerifyHostEmailPage() {
  return <AccountEmailForm mode="verify" />;
}
