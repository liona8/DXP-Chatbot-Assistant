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
  project_id: string;
  status: ProposalStatus;
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
function ActiveProjectBanner({
  project,
  onClick,
}: {
  project: ActiveProjectData;
  onClick: () => void;
}) {
  const initials = project.company_name
    .split(" ")
    .slice(0, 1)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const week = project.week_number ?? currentProjectWeek(project.project_start_date, project.project_duration_weeks);
  const totalWeeks = project.project_duration_weeks;
  const healthScore = project.health_score ?? 60;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border-2 border-green-200 p-5 flex items-center gap-4 cursor-pointer hover:border-green-300 hover:shadow-sm transition-all duration-200"
    >
      {/* Company avatar */}
      <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
        <span className="text-indigo-600 font-bold text-lg">{initials}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          {/* Green check badge */}
          <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-[10px] font-bold tracking-widest text-green-600 uppercase">Active Project</span>
        </div>
        <h3 className="text-[15px] font-bold text-gray-900 truncate">{project.title}</h3>
        <p className="text-[12px] text-gray-400 mt-0.5">
          {project.company_name}
          {project.signed_at
            ? ` · Signed ${new Date(project.signed_at).toLocaleDateString("en-MY", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}`
            : ""}
        </p>
      </div>

      {/* Week badge */}
      <div className="shrink-0 flex items-center gap-3">
        <span className="text-[12px] font-semibold text-gray-500 bg-gray-100 rounded-full px-3 py-1.5 border border-gray-200">
          Week {week}/{totalWeeks}
        </span>

        {/* Progress */}
        <div className="flex items-center gap-1.5">
          <span className="text-[14px] font-bold text-gray-700">{healthScore}%</span>
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
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
  const [activeProjects, setActiveProjects] = useState<ActiveProjectData[]>([]);
  const [proposalCounts, setProposalCounts] = useState<ProposalCounts>({ pending: 0, confirmed: 0 });
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"deadline" | "duration" | "spots">("deadline");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      console.log("[student/projects] Loading projects page data...");

      // Fetch open projects
      const { data: openData, error: openError } = await supabase
        .from("project")
        .select(PROJECT_SELECT)
        .eq("status", "open");
      console.log("[student/projects] Open projects fetch", {
        success: !openError,
        count: openData?.length ?? 0,
        error: openError?.message ?? null,
      });

      const user = await getCurrentUser();
      console.log("[student/projects] Current user fetch", {
        success: Boolean(user),
        userId: user?.id ?? null,
        role: user?.role ?? null,
      });

      if (user) {
        let activeConfirmedCount = 0;

        // Fetch confirmed proposals → active projects
        const [
          { data: confirmedProposals, error: confirmedError },
          { data: signedAgreements, error: signedError },
        ] = await Promise.all([
          supabase
            .from("proposal")
            .select("project_id, status")
            .eq("candidate_id", user.id)
            .eq("status", "confirmed"),
          supabase
            .from("signed_agreement")
            .select("project_id, signed_at, agreement_pdf_url")
            .eq("candidate_id", user.id),
        ]);
        console.log("[student/projects] Confirmed proposals fetch", {
          success: !confirmedError,
          count: confirmedProposals?.length ?? 0,
          projectIds: confirmedProposals?.map((row) => row.project_id) ?? [],
          error: confirmedError?.message ?? null,
        });
        console.log("[student/projects] Signed agreements fetch", {
          success: !signedError,
          count: signedAgreements?.length ?? 0,
          projectIds: signedAgreements?.map((row) => row.project_id) ?? [],
          error: signedError?.message ?? null,
        });

        if (confirmedProposals) {
          const confirmedRows = confirmedProposals as ConfirmedProposalRow[];
          const confirmedProjectIds = new Set(confirmedRows
            .map((row) => row.project_id)
            .filter(Boolean));
          const signedByProject = new Map(
            ((signedAgreements ?? []) as SignedAgreementRow[]).map((agreement) => [
              agreement.project_id,
              agreement,
            ])
          );
          const projectIds = [...confirmedProjectIds].filter((id) => signedByProject.has(id));
          activeConfirmedCount = projectIds.length;
          console.log("[student/projects] Active confirmed + signed project ids", projectIds);

          const { data: activeProjectsData, error: activeProjectsError } =
            projectIds.length > 0
              ? await supabase
                  .from("project")
                  .select(PROJECT_SELECT)
                  .in("id", projectIds)
              : { data: [], error: null };
          console.log("[student/projects] Active projects fetch", {
            success: !activeProjectsError,
            count: activeProjectsData?.length ?? 0,
            titles: activeProjectsData?.map((project) => project.title) ?? [],
            error: activeProjectsError?.message ?? null,
          });

          const active = ((activeProjectsData ?? []) as ActiveProjectData[]).map((project) => ({
            ...project,
            signed_at: signedByProject.get(project.id)?.signed_at ?? null,
            agreement_pdf_url: signedByProject.get(project.id)?.agreement_pdf_url ?? null,
          }));

          // Enrich with latest health log data
          if (active.length > 0) {
            const projectIds = active.map((p) => p.id);
            const { data: healthLogs, error: healthError } = await supabase
              .from("project_health_log")
              .select("project_id, week_number, health_score")
              .in("project_id", projectIds)
              .order("week_number", { ascending: false });
            console.log("[student/projects] Health logs fetch", {
              success: !healthError,
              count: healthLogs?.length ?? 0,
              error: healthError?.message ?? null,
            });

            const latestByProject = new Map<string, { week_number: number; health_score: number }>();
            if (healthLogs) {
              for (const log of healthLogs) {
                if (!latestByProject.has(log.project_id)) {
                  latestByProject.set(log.project_id, {
                    week_number: log.week_number,
                    health_score: log.health_score ?? 0,
                  });
                }
              }
            }

            const enriched = active.map((p) => ({
              ...p,
              week_number: latestByProject.get(p.id)?.week_number,
              health_score: latestByProject.get(p.id)?.health_score,
            }));

            setActiveProjects(enriched);
            console.log("[student/projects] Active projects rendered", {
              count: enriched.length,
              projects: enriched.map((project) => ({
                id: project.id,
                title: project.title,
                signed_at: project.signed_at,
                week_number: project.week_number,
                health_score: project.health_score,
              })),
            });
          } else {
            setActiveProjects([]);
            console.log("[student/projects] No active confirmed + signed projects to render");
          }
        }

        // Fetch proposal counts for summary card
        const { data: allProposals, error: allProposalsError } = await supabase
          .from("proposal")
          .select("status")
          .eq("candidate_id", user.id);
        console.log("[student/projects] Proposal counts fetch", {
          success: !allProposalsError,
          count: allProposals?.length ?? 0,
          statuses: allProposals?.map((proposal) => proposal.status) ?? [],
          error: allProposalsError?.message ?? null,
        });

        if (allProposals) {
          const pending = allProposals.filter((p) =>
            PENDING_PROPOSAL_STATUSES.includes(p.status as ProposalStatus)
          ).length;
          const confirmed = activeConfirmedCount;
          setProposalCounts({ pending, confirmed });
          console.log("[student/projects] Proposal counts rendered", { pending, confirmed });
        }
      }

      setOpenProjects(openData ?? []);
      setLoading(false);
      console.log("[student/projects] Loading complete");
    }

    load();
  }, []);

  // Filter active projects out of open list
  const activeIds = new Set(activeProjects.map((p) => p.id));

  const filtered = openProjects
    .filter((p) => !activeIds.has(p.id))
    .filter(
      (p) =>
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.company_name.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sort === "deadline")
        return (a.submission_end_date ?? "").localeCompare(b.submission_end_date ?? "");
      if (sort === "duration")
        return a.project_duration_weeks - b.project_duration_weeks;
      return b.max_candidates - a.max_candidates;
    });

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar overlay (mobile) */}
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

            {/* Page Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">My Projects</h1>
              <p className="text-sm text-gray-500 mt-1">
                Your active project and open DXP projects to apply for
              </p>
            </div>

            {/* Active Project Banner(s) */}
            {activeProjects.length > 0 && (
              <div className="flex flex-col gap-3 mb-4">
                {activeProjects.map((p) => (
                  <ActiveProjectBanner
                    key={p.id}
                    project={p}
                    onClick={() => router.push(`/student/projects/${p.id}`)}
                  />
                ))}
              </div>
            )}

            {/* My Proposals Summary */}
            <div className="mb-6">
              <ProposalsSummaryCard
                counts={proposalCounts}
                onViewAll={() => router.push("/student/proposals")}
              />
            </div>

            {/* Search + Sort */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <div className="relative flex-1">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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
                className="px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer text-gray-700"
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
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <svg
                  className="w-12 h-12 mx-auto mb-3 text-gray-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="font-medium text-gray-500">No projects found</p>
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
