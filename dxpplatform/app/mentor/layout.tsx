"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, signOutCurrentUser } from "@/lib/auth/current-user";
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  Radio,
  User,
  ChevronRight,
  Play,
  LogOut,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/mentor", icon: LayoutDashboard },
  { label: "Candidates", href: "/mentor/candidates", icon: Users },
  { label: "Projects", href: "/mentor/projects", icon: FolderOpen },
  { label: "Weekly Signals", href: "/mentor/weekly-signals", icon: Radio },
  { label: "Profile", href: "/mentor/profile", icon: User },
];

export default function MentorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    const init = async () => {
      const currentUser = await getCurrentUser();
      if (!currentUser || currentUser.role !== "mentor") {
        router.push("/login");
        return;
      }

      setUser({ name: currentUser.name, email: currentUser.email ?? "" });
    };
    init();
  }, [router]);

  const handleSignOut = async () => {
    await signOutCurrentUser();
    router.push("/login");
  };

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "M";

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col shrink-0">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Play className="w-4 h-4 text-white fill-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm leading-none">Kabel</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">
                DXP Platform
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(({ label, href, icon: Icon }) => {
            const isActive =
              href === "/mentor" ? pathname === "/mentor" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group ${
                  isActive
                    ? "bg-indigo-600 text-white"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-70" />}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gray-800 text-white text-xs font-bold flex items-center justify-center shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name ?? "..."}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email ?? ""}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
