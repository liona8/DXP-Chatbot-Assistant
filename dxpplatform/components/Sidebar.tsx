"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  BookOpen,
  Star,
  User,
  HelpCircle,
  X,
  ChevronRight,
  Play,
  LogOut,
} from "lucide-react";

import {
  getCurrentUser,
  signOutCurrentUser,
} from "@/lib/auth/current-user";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: FolderKanban, label: "My Projects", href: "/student/projects" },
  { icon: FileText, label: "Proposals", href: "/student/proposals" },
  { icon: BookOpen, label: "Weekly Logs", href: "/student/logs" },
  { icon: Star, label: "STAR Stories", href: "/student/star-stories" },
  { icon: User, label: "Profile", href: "/student/profile" },
  { icon: HelpCircle, label: "Help", href: "/student/help" },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<{
    name: string;
    email: string;
  } | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await getCurrentUser();

      if (!currentUser) {
        router.push("/login");
        return;
      }

      setUser({
        name: currentUser.name,
        email: currentUser.email ?? "",
      });
    };

    loadUser();
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
    : "U";

  return (
    <aside
      className={`
        fixed lg:static inset-y-0 left-0 z-30
        w-64 bg-white border-r border-gray-100
        flex flex-col shrink-0 h-screen
        transition-transform duration-300
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0
      `}
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Play className="w-4 h-4 text-white fill-white" />
            </div>

            <div>
              <p className="font-bold text-gray-900 text-sm leading-none">
                Kabel
              </p>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">
                DXP Platform
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="lg:hidden text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ icon: Icon, label, href }) => {
          const isActive =
            href === "/student"
              ? pathname === "/student"
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-indigo-600 text-white"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {isActive && (
                <ChevronRight className="w-3.5 h-3.5 opacity-70" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User + Sign out */}
      <div className="px-4 py-4 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gray-800 text-white text-xs font-bold flex items-center justify-center shrink-0">
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.name ?? "..."}
            </p>
            <p className="text-xs text-gray-400 truncate">
              {user?.email ?? ""}
            </p>
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
  );
}