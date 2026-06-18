import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { auth } from "@/lib/auth";
import { ensureDefaultWorkspace } from "@/lib/workspace";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const currentMembership = await ensureDefaultWorkspace(session.user);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col lg:grid lg:grid-cols-[260px_1fr]">
        <aside className="border-slate-800 bg-slate-950/95 lg:border-r lg:px-5 lg:py-6">
          <div className="hidden lg:block">
            <div className="text-lg font-bold">AI Facebook Poster</div>
            <p className="mt-2 text-sm text-slate-400">
              {currentMembership.workspaceName}
            </p>
          </div>

          <div className="mt-0 lg:mt-8">
            <DashboardNav />
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex flex-col gap-4 border-b border-slate-800 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-400">
                {currentMembership.workspaceName}
              </p>
              <p className="mt-1 text-sm text-slate-300">
                สวัสดี {session.user.name ?? session.user.email}
              </p>
            </div>

            <SignOutButton />
          </header>

          <div className="flex-1 px-6 py-8">{children}</div>
        </section>
      </div>
    </main>
  );
}
