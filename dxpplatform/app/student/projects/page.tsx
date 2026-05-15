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

type ProposalStatus =
  | "submitted"
  | "reviewed"
  | "shortlisted"
  | "interviewed"
  | "selected"
  | "confirmed";

interface ActiveProjectData extends Project {
  week_number?: number;
  health_score?: number;
  signed_at?: string | null;
  agreement_pdf_url?: string | null;
}

interface ConfirmedProposalRow {
  id: string;
  project_id: string;
  signed_agreement: {
    signed_at: string | null;
    candidate_id: string;
  }[];
}

interface SignedAgreementRow {
  project_id: string;
  signed_at: string | null;
  agreement_pdf_url: string | null;
}

interface ProposalCounts {
  pending: number;
  confirmed: number;
}

function getInitials(name = "") {
  return name.trim().split(" ")[0]?.[0]?.toUpperCase() ?? "?";
}
 
function stripMarkdown(text = "") {
  return text
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/\n+/g, " ")
    .trim();
}
 
function formatDeadline(dateStr: string | null) {
  if (!dateStr) return "TBD";
  return new Date(dateStr).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Countdown hook ───────────────────────────────────────────────────────────
const PROJECT_SELECT = `
  id, title, company_name, company_industry, problem_statement,
  project_duration_weeks, max_candidates, status,
  submission_end_date, project_start_date, compensation_amount
`;

const PENDING_PROPOSAL_STATUSES: ProposalStatus[] = [
  "submitted",
  "reviewed",
  "shortlisted",
  "interviewed",
  "selected",
];

const Icons = {
  Dashboard: () => (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  Folder: () => (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>
    </svg>
  ),
  File: () => (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z"/>
    </svg>
  ),
  Book: () => (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
    </svg>
  ),
  Star: () => (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
    </svg>
  ),
  User: () => (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
    </svg>
  ),
  ChevronRight: () => (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
    </svg>
  ),
  ArrowRight: () => (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
    </svg>
  ),
  CheckCircle: () => (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>
  ),
  Clock: () => (
    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>
  ),
  Users: () => (
    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
    </svg>
  ),
  Calendar: () => (
    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
    </svg>
  ),
  Search: () => (
    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
    </svg>
  ),
  FileText: () => (
    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
    </svg>
  ),
  Play: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
      <path d="M8 5v14l11-7L8 5z"/>
    </svg>
  ),
};

function currentProjectWeek(startDate: string | null, durationWeeks: number) {
  if (!startDate) return 1;

  const start = new Date(startDate).getTime();
  if (Number.isNaN(start)) return 1;

  const week = Math.ceil((Date.now() - start) / (7 * 24 * 60 * 60 * 1000));
  return Math.min(Math.max(week, 1), durationWeeks || 1);
}

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
      const days = Math.floor(diff / 86400000);
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);

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

// ─── Active Project Banner ────────────────────────────────────────────────────
function ActiveProjectBanner({ project, onClick }: { 
  project: ActiveProjectData; 
  onClick: () => void;
}) {
  const week = currentProjectWeek(project.project_start_date, project.project_duration_weeks);
  const healthScore = project.health_score ?? 60;

  return (
    <div
      onClick={onClick}
      style={{
        background: "white",
        border: "2px solid #bbf7d0",
        borderRadius: 16,
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        gap: 16,
        cursor: "pointer",
        transition: "all 0.2s",
        marginBottom: 12,
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "#86efac"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "#bbf7d0"; e.currentTarget.style.boxShadow = "none"; }}
    >
      {/* Avatar */}
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: "#e0e7ff",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <span style={{ color: "#4338ca", fontWeight: 800, fontSize: 16 }}>
          {getInitials(project.company_name)}
        </span>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <span style={{ color: "#22c55e" }}><Icons.CheckCircle /></span>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#16a34a", letterSpacing: "1.2px", textTransform: "uppercase" }}>
            Active Project
          </span>
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#111", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {project.title}
        </div>
        <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
          {project.company_name}
          {project.signed_at ? ` · Signed ${new Date(project.signed_at).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}` : ""}
        </div>
      </div>

      {/* Week + score */}
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{
          fontSize: 12, fontWeight: 600, color: "#6b7280",
          background: "#f9fafb", border: "1px solid #e5e7eb",
          borderRadius: 20, padding: "5px 12px",
        }}>
          Week {week}/{project.project_duration_weeks}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#374151" }}>{healthScore}%</span>
          <span style={{ color: "#9ca3af" }}><Icons.ChevronRight /></span>
        </div>
      </div>
    </div>
  );
}

// ─── Proposals Summary Card ───────────────────────────────────────────────────
function ProposalsSummaryCard({
  counts,
  onViewAll,
}: {
  counts: ProposalCounts;
  onViewAll: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
          <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h2 className="text-[15px] font-bold text-gray-800">My Proposals</h2>
      </div>

      <div className="flex items-center gap-4">
        {/* Pending */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
            <span className="text-[16px] font-bold text-gray-700">{counts.pending}</span>
          </div>
          <div>
            <p className="text-[11px] text-gray-400">Pending</p>
            <p className="text-[13px] font-semibold text-gray-700">Review</p>
          </div>
        </div>

        <div className="w-px h-8 bg-gray-200" />

        {/* Confirmed */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
            <span className="text-[16px] font-bold text-white">{counts.confirmed}</span>
          </div>
          <div>
            <p className="text-[11px] text-gray-400">Confirmed</p>
            <p className="text-[13px] font-semibold text-gray-700">Active</p>
          </div>
        </div>

        {/* View All */}
        <button
          onClick={onViewAll}
          className="ml-auto flex items-center gap-1.5 text-[13px] font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl transition-colors"
        >
          View All
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Project Card ─────────────────────────────────────────────────────────────
function ProjectCard({ project, onClick }: { project: Project; onClick: () => void }) {
  const { timeLeft, urgency } = useCountdown(project.submission_end_date);

  const cleanDesc = project.problem_statement
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/\n+/g, " ")
    .trim();

  const truncated = cleanDesc.length > 140 ? cleanDesc.slice(0, 140) + "..." : cleanDesc;

  const initials = project.company_name
    .split(" ")
    .slice(0, 1)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const urgencyClasses = {
    red: "bg-red-50 text-red-500 border border-red-200",
    yellow: "bg-amber-50 text-amber-600 border border-amber-200",
    normal: "bg-indigo-50 text-indigo-500 border border-indigo-200",
  };

  const deadlineLabel = project.submission_end_date
    ? new Date(project.submission_end_date).toLocaleDateString("en-MY", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "TBD";

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col gap-4 hover:shadow-md hover:border-indigo-200 transition-all duration-200 cursor-pointer group"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
          <span className="text-indigo-600 font-bold text-base">{initials}</span>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase truncate">
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
        <span className="flex items-center gap-1.5 text-[12px] text-gray-500 bg-gray-100 rounded-full px-3 py-1 border border-gray-200">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {project.project_duration_weeks} weeks
        </span>

        {/* Spots */}
        <span className="flex items-center gap-1.5 text-[12px] text-gray-500 bg-gray-100 rounded-full px-3 py-1 border border-gray-200">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {project.max_candidates} spots
        </span>

        {/* Countdown */}
        {timeLeft && timeLeft !== "Closed" && (
          <span className={`flex items-center gap-1.5 text-[12px] rounded-full px-3 py-1 font-medium ${urgencyClasses[urgency]}`}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {timeLeft}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
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
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Skeleton Loader ──────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 h-52 animate-pulse">
      <div className="flex gap-3 mb-4">
        <div className="w-11 h-11 bg-gray-200 rounded-xl shrink-0" />
        <div className="flex-1">
          <div className="h-2.5 bg-gray-200 rounded-full w-20 mb-2" />
          <div className="h-4 bg-gray-200 rounded-full w-40" />
        </div>
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-3 bg-gray-100 rounded-full w-full" />
        <div className="h-3 bg-gray-100 rounded-full w-5/6" />
        <div className="h-3 bg-gray-100 rounded-full w-4/6" />
      </div>
      <div className="flex gap-2">
        <div className="h-6 bg-gray-100 rounded-full w-20" />
        <div className="h-6 bg-gray-100 rounded-full w-16" />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProjectsPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [openProjects, setOpenProjects] = useState<Project[]>([]);
  const [inProgressProjects, setInProgressProjects] = useState<ActiveProjectData[]>([]);

  const [proposalCounts, setProposalCounts] = useState<ProposalCounts>({
    pending: 0,
    confirmed: 0,
  });

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"deadline" | "duration" | "spots">("deadline");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      console.log("[student/projects] Loading...");

      const user = await getCurrentUser();

      if (!user) {
        setLoading(false);
        return;
      }

      // ─────────────────────────────────────────────
      // 1. OPEN PROJECTS
      // ─────────────────────────────────────────────
      const { data: openData } = await supabase
        .from("project")
        .select(PROJECT_SELECT)
        .eq("status", "open");

      setOpenProjects(openData ?? []);

      // ─────────────────────────────────────────────
      // 2. IN-PROGRESS PROJECTS (FIXED LOGIC)
      // ─────────────────────────────────────────────
      const { data: confirmedProposals, error } = await supabase
        .from("proposal")
        .select("id, project_id")
        .eq("status", "confirmed")
        .eq("candidate_id", user.id);

      console.log("confirmedProposals", confirmedProposals);
      console.log("ERROR", error);
      console.log("USER ID:", user.id);

      const projectIds =
        confirmedProposals?.map((r) => r.project_id) ?? [];

      let inProgressFormatted: ActiveProjectData[] = [];

      if (projectIds.length > 0) {
        const { data: projectData, error: projectError } = await supabase
          .from("project")
          .select(PROJECT_SELECT)
          .in("id", projectIds);

        console.log("projectData", projectData);
        console.log("projectError", projectError);

        inProgressFormatted =
          (projectData ?? []).map((proj) => ({
            ...proj,
            signed_at: null,
          }));
      }

      setInProgressProjects(inProgressFormatted);

      // ─────────────────────────────────────────────
      // 3. PROPOSAL COUNTS
      // ─────────────────────────────────────────────
      const { data: allProposals } = await supabase
        .from("proposal")
        .select("status")
        .eq("candidate_id", user.id);

      const pending = (allProposals ?? []).filter((p) =>
        PENDING_PROPOSAL_STATUSES.includes(p.status as ProposalStatus)
      ).length;

      setProposalCounts({
        pending,
        confirmed: inProgressFormatted.length,
      });

      setLoading(false);
    }

    load();
  }, []);

  // ─────────────────────────────────────────────
  // FILTER OPEN PROJECTS ONLY
  // ─────────────────────────────────────────────
  const inProgressIds = new Set(inProgressProjects.map((p) => p.id));

  const filtered = openProjects
    .filter((p) => !inProgressIds.has(p.id))
    .filter(
      (p) =>
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.company_name.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sort === "deadline")
        return (a.submission_end_date ?? "").localeCompare(
          b.submission_end_date ?? ""
        );
      if (sort === "duration")
        return a.project_duration_weeks - b.project_duration_weeks;
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

    <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 mx-auto">

          {/* ───────────────── HEADER ───────────────── */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              My Projects
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Your active project and open DXP projects to apply for
            </p>
          </div>

          {/* ───────────────── ACTIVE PROJECT ───────────────── */}
          {inProgressProjects.length > 0 && (
            <div className="mb-5">
              {inProgressProjects.map((p) => (
                <ActiveProjectBanner
                  key={p.id}
                  project={p}
                  onClick={() =>
                    router.push(`/student/projects/${p.id}`)
                  }
                />
              ))}
            </div>
          )}

          {/* ───────────────── PROPOSAL SUMMARY ───────────────── */}
          <div className="mb-6">
            <ProposalsSummaryCard
              counts={proposalCounts}
              onViewAll={() => router.push("/student/proposals")}
            />
          </div>

          {/* ───────────────── SEARCH + SORT ───────────────── */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>

              <input
                type="text"
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white"
              />
            </div>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              className="px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white"
            >
              <option value="deadline">Deadline Soonest</option>
              <option value="duration">Shortest Duration</option>
              <option value="spots">Most Spots</option>
            </select>
          </div>

          {/* ───────────────── OPEN PROJECTS TITLE ───────────────── */}
          <div className="mb-3">
            <h2 className="text-lg font-bold text-gray-900">
              Open Projects
            </h2>
          </div>

          {/* ───────────────── OPEN PROJECT GRID ───────────────── */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="font-medium">No projects found</p>
              <p className="text-sm mt-1">Try adjusting your search</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onClick={() =>
                    router.push(`/student/projects/${project.id}`)
                  }
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