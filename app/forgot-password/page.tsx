import { AccountEmailForm } from "@/components/ui/account-email-form";

export const metadata = { title: "Forgot password" };
export default function ForgotPasswordPage() {
  return <AccountEmailForm mode="reset" />;
}
