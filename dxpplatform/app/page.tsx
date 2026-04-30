"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import SubmitProposal from "@/components/SubmitProposal";
import ProblemOverview from "@/components/ProblemOverview";
import MissionSection from "@/components/MissionSection";
import MentorChat from "@/components/MentorChat";

export default function Home() {
  const [chatOpen, setChatOpen] = useState(true);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar onToggleChat={() => setChatOpen((o) => !o)} chatOpen={chatOpen} />
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="p-6 flex flex-col gap-5">
              <SubmitProposal />
              <ProblemOverview />
              <MissionSection />
            </div>
          </div>
          <MentorChat isOpen={chatOpen} onClose={() => setChatOpen(false)} />
        </div>
      </div>
    </div>
  );
}
