"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    description: "ภาพรวมระบบ",
  },
  {
    href: "/dashboard/posts/new",
    label: "Create Post",
    description: "สร้าง Draft ใหม่",
  },
  {
    href: "/dashboard/posts",
    label: "Posts",
    description: "รายการโพสต์",
  },
  {
    href: "/dashboard/topics",
    label: "Topic Queue",
    description: "คลังหัวข้อ AI",
  },
  {
    href: "/dashboard/pantip",
    label: "Pantip Post",
    description: "โพสต์จากลิงก์ Pantip",
  },
  {
    href: "/dashboard/news",
    label: "News Post",
    description: "โพสต์จากข่าว RSS",
  },
  {
    href: "/dashboard/autopilot",
    label: "Auto Pilot",
    description: "ตั้งเวลา AI อัตโนมัติ",
  },
  {
    href: "/dashboard/style",
    label: "Writing Style",
    description: "สไตล์การเขียน",
  },
  {
    href: "/dashboard/settings/ai",
    label: "AI Settings",
    description: "Gemini API Key",
  },
  {
    href: "/dashboard/facebook",
    label: "Facebook Page",
    description: "เชื่อมต่อเพจ",
  },
  {
    href: "/dashboard/deploy",
    label: "Deploy",
    description: "เช็กก่อนขึ้น Vercel",
  },
];

function isNavItemActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href;
  }

  if (href === "/dashboard/posts/new") {
    return pathname === href;
  }

  if (href === "/dashboard/posts") {
    return pathname === href || /^\/dashboard\/posts\/[^/]+$/.test(pathname);
  }

  return pathname.startsWith(href);
}

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-2 overflow-x-auto border-b border-slate-800 px-6 py-3 lg:flex-col lg:border-b-0 lg:px-0 lg:py-0">
      {navItems.map((item) => {
        const isActive = isNavItemActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              isActive
                ? "min-w-fit rounded-xl border border-blue-400/40 bg-blue-500/15 px-4 py-3 text-sm text-blue-100"
                : "min-w-fit rounded-xl border border-transparent px-4 py-3 text-sm text-slate-300 hover:border-slate-700 hover:bg-slate-900 hover:text-white"
            }
          >
            <div className="font-semibold">{item.label}</div>
            <div className="mt-1 hidden text-xs text-slate-400 sm:block">
              {item.description}
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
