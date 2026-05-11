"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, MessageCircle, Menu } from "lucide-react";

interface TopbarProps {
  onToggleChat: () => void;
  onToggleSidebar: () => void;
  chatOpen: boolean;
  title?: string;
  subtitle?: string;
  durationLabel?: string;
  deadlineLabel?: string | null;
  avatarLabel?: string;
  backHref?: string;
}

export default function Topbar({
  onToggleChat,
  onToggleSidebar,
  chatOpen,
  title = "Budget Planning Workflow",
  subtitle = "ICT infrastructure distributor",
  durationLabel = "8 weeks",
  deadlineLabel = "3 days left",
  avatarLabel = "I",
  backHref = "/student",
}: TopbarProps) {
  const router = useRouter();

  return (
    <header className="bg-white border-b border-gray-100 px-3 md:px-6 py-3 flex items-center gap-2 md:gap-3 shrink-0">
      <button
        onClick={onToggleSidebar}
        className="lg:hidden w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors"
      >
        <Menu size={14} strokeWidth={1.5} />
      </button>

      <button
        onClick={() => router.push(backHref)}
        className="hidden lg:flex w-7 h-7 rounded-lg border border-gray-200 items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors"
        aria-label="Back to projects"
      >
        <ChevronLeft size={14} strokeWidth={1.5} />
      </button>

      <div className="w-7 h-7 md:w-8 md:h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-[12px] md:text-[13px] font-medium text-indigo-700 shrink-0">
        {avatarLabel}
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-[10px] md:text-[11px] text-gray-400 truncate hidden sm:block">
          {subtitle}
        </div>
        <div className="text-sm md:text-base font-medium text-gray-900 leading-tight truncate">
          {title}
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-1.5 mr-1">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-500 border border-gray-200 whitespace-nowrap">
          {durationLabel}
        </span>
        {deadlineLabel && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-100 text-red-700 whitespace-nowrap">
            {deadlineLabel}
          </span>
        )}
      </div>

      <button
        onClick={onToggleChat}
        className={`flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3.5 py-1.5 rounded-lg text-[12px] md:text-[13px] font-medium transition-colors whitespace-nowrap shrink-0 ${
          chatOpen
            ? "bg-indigo-100 text-indigo-700"
            : "bg-indigo-700 text-white hover:bg-indigo-800"
        }`}
      >
        <MessageCircle size={13} strokeWidth={1.5} />
        <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-400 pulse-dot" />
        <span className="hidden sm:inline">Ask Thinkra</span>
      </button>
    </header>
  );
}
