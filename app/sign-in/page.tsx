import { AuthForm } from "@/components/ui/auth-form";

export const metadata = { title: "Sign in" };
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string; reset?: string }>;
}) {
  const params = await searchParams;
  const notice =
    params.reset === "1"
      ? "Your password was updated."
      : params.verified === "1"
        ? "Your host email is verified. Sign in to continue."
        : undefined;
  return <AuthForm registering={false} notice={notice} />;
}
