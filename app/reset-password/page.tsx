import { redirect } from "next/navigation";

import { AuthCard } from "@/components/auth-card";
import { getCurrentUser } from "@/lib/user-auth";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage(props: PageProps<"/reset-password">) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/library");
  }

  const searchParams = await props.searchParams;
  const error =
    typeof searchParams.error === "string" ? searchParams.error : null;
  const success =
    typeof searchParams.success === "string" ? searchParams.success : null;
  const email =
    typeof searchParams.email === "string" ? searchParams.email : "";

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#03030d] px-4 py-6 text-white sm:px-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,122,69,0.18),transparent_27%),radial-gradient(circle_at_84%_16%,rgba(255,255,255,0.06),transparent_22%),linear-gradient(180deg,#050616,#02020a)]" />
      <div className="relative z-10 w-full max-w-[580px]">
        <AuthCard
          mode="reset-password"
          next="/sign-in"
          error={error}
          success={success}
          initialEmail={email}
        />
      </div>
    </main>
  );
}
