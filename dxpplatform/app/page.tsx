"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import SubmitProposal from "@/components/SubmitProposal";
import ProblemOverview from "@/components/ProblemOverview";
import MissionSection from "@/components/MissionSection";
import MentorChat from "@/components/MentorChat";

export default function Home() {
  const [chatOpen, setChatOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-col flex-1 min-w-0">
        <Topbar
          onToggleChat={() => setChatOpen((o) => !o)}
          onToggleSidebar={() => setSidebarOpen((o) => !o)}
          chatOpen={chatOpen}
        />

        <div className="flex flex-1 overflow-hidden relative">
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="p-4 md:p-6 flex flex-col gap-4 md:gap-5 w-full mx-auto">
              <SubmitProposal />
              <ProblemOverview />
              <MissionSection />
            </div>
          </div>

          {/* Chat — sidebar on desktop, bottom drawer on mobile */}
          <MentorChat isOpen={chatOpen} onClose={() => setChatOpen(false)} />
        </div>
      </div>
    </div>
  );
}