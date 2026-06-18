"use client";

import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/login");
          router.refresh();
        },
      },
    });
  }

  return (
    <button
      onClick={handleSignOut}
      className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:border-red-400 hover:text-red-200"
    >
      ออกจากระบบ
    </button>
  );
}
