"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUser } from "@/lib/auth/current-user";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Project {
  id: string;
  title: string;
  company_name: string;
  company_industry: string;
  problem_statement: string;
  project_duration_weeks: number;
  max_candidates: number;
  status: "open" | "closed" | "draft" | "in_progress";
  submission_end_date: string | null;
  project_start_date: string | null;
  compensation_amount: number;
}

interface ConfirmedProposalRow {
  project: Project | Project[] | null;
}

// ─── Countdown hook ───────────────────────────────────────────────────────────
function useCountdown(targetDate: string | null) {
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [urgency, setUrgency] = useState<"red" | "yellow" | "normal">("normal");

  useEffect(() => {
    if (!targetDate) return;
    const target = new Date(targetDate).getTime();

    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        setTimeLeft("Closed");
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);

      const days = Math.floor(diff / 86400000);
      if (days === 0) {
        setUrgency("red");
        setTimeLeft(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
      } else if (days <= 7) {
        setUrgency("yellow");
        setTimeLeft(`${days} day${days !== 1 ? "s" : ""} left`);
      } else {
        setUrgency("normal");
        setTimeLeft(`${days} days left`);
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  return { timeLeft, urgency };
}

// ─── Project Card ─────────────────────────────────────────────────────────────
function ProjectCard({ project, onClick }: { project: Project; onClick: () => void }) {
  const { timeLeft, urgency } = useCountdown(project.submission_end_date);

  // Strip markdown and truncate
  const cleanDesc = project.problem_statement
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/\n+/g, " ")
    .trim();

  const truncated = cleanDesc.length > 140 ? cleanDesc.slice(0, 140) + "..." : cleanDesc;

  // Company initials avatar
  const initials = project.company_name
    .split(" ")
    .slice(0, 1)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const urgencyClasses = {
    red: "bg-red-50 text-red-500 border border-red-200",
    yellow: "bg-amber-50 text-amber-600 border border-amber-200",
    normal: "bg-gray-100 text-gray-500 border border-gray-200",
  };

  const urgencyIcon = {
    red: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    yellow: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    normal: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  };

  const deadlineLabel = project.submission_end_date
    ? new Date(project.submission_end_date).toLocaleDateString("en-MY", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "TBD";

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col gap-4 hover:shadow-md hover:border-indigo-300 transition-all duration-200 cursor-pointer group">
      {/* Header */}
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-11 h-11 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
          <span className="text-indigo-600 font-bold text-base">{initials}</span>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase truncate">
            {project.company_industry}
          </p>
          <h3 className="text-[15px] font-bold text-gray-900 leading-snug mt-0.5 group-hover:text-indigo-700 transition-colors">
            {project.title}
          </h3>
        </div>
      </div>

      {/* Description */}
      <p className="text-[13px] text-gray-500 leading-relaxed flex-1">{truncated}</p>

      {/* Meta badges */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Duration */}
        <span className="flex items-center gap-1.5 text-[12px] text-gray-500 bg-gray-100 rounded-full px-3 py-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {project.project_duration_weeks} weeks
        </span>

        {/* Spots */}
        <span className="flex items-center gap-1.5 text-[12px] text-gray-500 bg-gray-100 rounded-full px-3 py-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {project.max_candidates} spots
        </span>

        {/* Countdown */}
        {timeLeft && timeLeft !== "Closed" && (
          <span className={`flex items-center gap-1.5 text-[12px] rounded-full px-3 py-1 font-medium ${urgencyClasses[urgency]}`}>
            {urgencyIcon[urgency]}
            {timeLeft}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-gray-100">
        <span className="text-[12px] text-gray-400">
          Deadline: {deadlineLabel}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-[13px] font-semibold px-4 py-2 rounded-xl transition-all duration-150"
        >
          Apply Now
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Active Project Card ──────────────────────────────────────────────────────
function ActiveProjectCard({ project, onClick }: { project: Project; onClick: () => void }) {
  const initials = project.company_name
    .split(" ")
    .slice(0, 1)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div
      onClick={onClick}
      className="bg-linear-to-br from-indigo-600 to-indigo-800 rounded-2xl p-5 flex flex-col gap-3 cursor-pointer hover:shadow-lg hover:shadow-indigo-200 transition-all duration-200 col-span-full"
    >
      <div className="flex items-center gap-2">
        <span className="bg-white/20 text-white text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full">
          Active Project
        </span>
      </div>
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-base">{initials}</span>
        </div>
        <div>
          <p className="text-indigo-200 text-[11px] font-semibold tracking-widest uppercase">
            {project.company_name}
          </p>
          <h3 className="text-white font-bold text-[16px] mt-0.5">{project.title}</h3>
        </div>
      </div>
      <div className="flex items-center gap-3 mt-1">
        <span className="flex items-center gap-1.5 text-indigo-200 text-[12px] bg-white/10 rounded-full px-3 py-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {project.project_duration_weeks} weeks
        </span>
        <button
          onClick={onClick}
          className="ml-auto flex items-center gap-1.5 bg-white text-indigo-700 font-semibold text-[13px] px-4 py-2 rounded-xl hover:bg-indigo-50 transition-colors"
        >
          View Project →
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Project() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjects, setActiveProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"deadline" | "duration" | "spots">("deadline");
  const [loading, setLoading] = useState(true);

    useEffect(() => {
    async function load() {
        const supabase = createClient();

        const { data: openProjects } = await supabase
        .from("project")
        .select(`
            id,
            title,
            company_name,
            company_industry,
            problem_statement,
            project_duration_weeks,
            max_candidates,
            status,
            submission_end_date,
            project_start_date,
            compensation_amount
        `)
        .eq("status", "open");

        const user = await getCurrentUser();

        if (user) {
        const { data: myProposals } = await supabase
            .from("proposal")
            .select(`
            project_id,
            project:project_id(
                id,
                title,
                company_name,
                company_industry,
                problem_statement,
                project_duration_weeks,
                max_candidates,
                status,
                submission_end_date,
                project_start_date,
                compensation_amount
            )
            `)
            .eq("candidate_id", user.id)
            .eq("status", "confirmed");

        if (myProposals) {
            const active = myProposals
            .map((proposal: ConfirmedProposalRow) =>
              Array.isArray(proposal.project) ? proposal.project[0] : proposal.project
            )
            .filter(Boolean);

            setActiveProjects(active as Project[]);
        }
        }

        setProjects(openProjects ?? []);
        setLoading(false);
    }

    load();
    }, []);

  // Filter + sort
  const filtered = projects
    .filter((p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.company_name.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sort === "deadline") {
        return (a.submission_end_date ?? "").localeCompare(b.submission_end_date ?? "");
      }
      if (sort === "duration") return a.project_duration_weeks - b.project_duration_weeks;
      return b.max_candidates - a.max_candidates;
    });

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-col flex-1 min-w-0">

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 mx-auto">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">My Projects</h1>
              <p className="text-sm text-gray-500 mt-1">
                Your active project and open DXP projects to apply for
              </p>
            </div>

            {/* Active Projects */}
            {activeProjects.length > 0 && (
              <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeProjects.map((p) => (
                  <ActiveProjectCard
                    key={p.id}
                    project={p}
                    onClick={() => router.push(`/student/projects/${p.id}`)}
                  />
                ))}
              </div>
            )}

            {/* Search + Sort */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <div className="relative flex-1">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                />
              </div>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
                className="px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer"
              >
                <option value="deadline">Deadline Soonest</option>
                <option value="duration">Shortest Duration</option>
                <option value="spots">Most Spots</option>
              </select>
            </div>

            {/* Cards grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 h-52 animate-pulse">
                    <div className="flex gap-3 mb-4">
                      <div className="w-11 h-11 bg-gray-200 rounded-xl" />
                      <div className="flex-1">
                        <div className="h-3 bg-gray-200 rounded w-24 mb-2" />
                        <div className="h-4 bg-gray-200 rounded w-40" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-100 rounded w-full" />
                      <div className="h-3 bg-gray-100 rounded w-5/6" />
                      <div className="h-3 bg-gray-100 rounded w-4/6" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="font-medium">No projects found</p>
                <p className="text-sm mt-1">Try adjusting your search</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onClick={() => router.push(`/student/projects/${project.id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
