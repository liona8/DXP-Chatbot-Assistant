"use client";

import { ChevronLeft, MessageCircle } from "lucide-react";

interface TopbarProps {
  onToggleChat: () => void;
  chatOpen: boolean;
}

export default function Topbar({ onToggleChat, chatOpen }: TopbarProps) {
  return (
    <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-3 shrink-0">
      <button className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors">
        <ChevronLeft size={14} strokeWidth={1.5} />
      </button>

      <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-[13px] font-medium text-indigo-700">
        I
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-gray-400">ICT infrastructure distributor</div>
        <div className="text-base font-medium text-gray-900 leading-tight">Budget Planning Workflow</div>
      </div>

      <div className="flex items-center gap-1.5 mr-1">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-500 border border-gray-200">
          8 weeks
        </span>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-100 text-red-700">
          3 days left
        </span>
      </div>

      <button
        onClick={onToggleChat}
        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
          chatOpen
            ? "bg-indigo-100 text-indigo-700"
            : "bg-indigo-700 text-white hover:bg-indigo-800"
        }`}
      >
        <MessageCircle size={14} strokeWidth={1.5} />
        <div className="w-2 h-2 rounded-full bg-emerald-400 pulse-dot" />
        Ask Thinkra
      </button>
    </header>
  );
}
