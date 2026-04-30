"use client";

import {
  LayoutDashboard, FolderKanban, FileText,
  BookOpen, Star, User, HelpCircle, X,
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard",    active: false },
  { icon: FolderKanban,   label: "My Projects",  active: true  },
  { icon: FileText,       label: "Proposals",    active: false },
  { icon: BookOpen,       label: "Weekly Logs",  active: false },
  { icon: Star,           label: "STAR Stories", active: false },
  { icon: User,           label: "Profile",      active: false },
  { icon: HelpCircle,     label: "Help",         active: false },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <aside
      className={`
        fixed lg:static inset-y-0 left-0 z-30
        w-55w-[220px] bg-white border-r border-gray-100
        flex flex-col py-4 h-screen
        transition-transform duration-300
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0
      `}
    >
      {/* Logo + mobile close */}
      <div className="flex items-center justify-between px-4 pb-5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-700 rounded-lg flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="white">
              <polygon points="3,13 8,3 13,13" opacity="0.9" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900 leading-tight">Kabel</div>
            <div className="text-[10px] text-gray-400 tracking-widest leading-tight">DXP PLATFORM</div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600"
        >
          <X size={16} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1">
        {navItems.map(({ icon: Icon, label, active }) => (
          <button
            key={label}
            onClick={onClose}
            className={`w-full flex items-center gap-2.5 px-4 py-2 text-[13px] transition-colors text-left ${
              active
                ? "bg-indigo-50 text-indigo-700 font-medium border-r-2 border-indigo-700"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
            }`}
          >
            <Icon size={15} strokeWidth={1.5} />
            {label}
          </button>
        ))}
      </nav>

      {/* User */}
      <div className="px-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-[11px] font-medium text-indigo-700 shrink-0">
            TPY
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-gray-900 truncate">Tok Pei Ying</div>
            <div className="text-[10px] text-gray-400 truncate">lionatok09@gmail.com</div>
          </div>
        </div>
      </div>
    </aside>
  );
}