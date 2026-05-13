"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import MentorChat from "@/components/MentorChat";
import type { MentorChatContext } from "@/components/MentorChat";
import {
  ArrowLeft,
  Calendar,
  ExternalLink,
  Users,
  CheckCircle,
  AlertTriangle,
  Activity,
  ClipboardList,
  Globe,
  FileText,
  MessageCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Project = {
  id: string;
  title: string;
  company_name: string;
  company_website: string | null;
  problem_statement: string;
  project_scope: string | null;
  requirements: string | null;
  project_start_date: string | null;
  project_duration_weeks: number;
  status: string;
  max_candidates: number;
};

type HealthLog = {
  week_number: number;
  health_score: number;
  status: string;
  red_flags: string[] | null;
  recommendations: string[] | null;
  summary: string | null;
  executive_summary: Record<string, unknown> | null;
};

type Candidate = {
  id: string;
  name: string;
  email: string;
  institution: string | null;
  field_of_study: string | null;
  proposal_url: string | null;
  is_group: boolean;
  group_name: string | null;
};

type Signal = {
  candidate_id: string;
  week_no: number;
  prepared: string;
  clarity: string;
  follow_through: string;
  prompting: boolean;
  no_show: boolean;
  observation: string | null;
};

type SignalStamp = {
  candidate_id: string;
  week_no: number;
};

type ExecutiveSummary = {
  progress?: string | string[];
  todos?: string | unknown[];
  blockers?: unknown;
  discussion_points?: string | string[];
  risk_rating?: string | { level?: string; explanation?: string };
};

const healthColor: Record<string, string> = {
  healthy: "bg-emerald-500",
  at_risk: "bg-amber-400",
  critical: "bg-red-500",
};

const healthTextColor: Record<string, string> = {
  healthy: "text-emerald-700 bg-emerald-50 border-emerald-200",
  at_risk: "text-amber-700 bg-amber-50 border-amber-200",
  critical: "text-red-700 bg-red-50 border-red-200",
};

function SignalWeekBox({
  week,
  done,
  total,
  current,
}: {
  week: number;
  done: number;
  total: number;
  current: number;
}) {
  const isFuture = week > current;
  const complete = total > 0 && done >= total;
  const partial = done > 0 && done < total;
  const styles = complete
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : partial
    ? "border-amber-200 bg-amber-50 text-amber-700"
    : isFuture
    ? "border-gray-200 bg-white text-gray-400"
    : "border-gray-200 bg-gray-50 text-gray-500";

  return (
    <div className={`h-12 min-w-20 rounded-lg border px-3 py-2 text-center ${styles}`}>
      <div className="text-[10px] font-semibold uppercase leading-none">W{week}</div>
      <div className="mt-1 text-xs font-bold">
        {done}/{total}
      </div>
    </div>
  );
}

function summaryText(value: unknown) {
  if (!value || (Array.isArray(value) && value.length === 0)) {
    return "None reported.";
  }

  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === "string" ? item : JSON.stringify(item))).join(", ");
  }

  return typeof value === "string" ? value : JSON.stringify(value);
}

function riskRatingInfo(value: ExecutiveSummary["risk_rating"]) {
  if (!value) return null;

  if (typeof value === "string") {
    return { label: value, detail: null };
  }

  return {
    label: value.level ?? "unknown",
    detail: value.explanation ?? null,
  };
}

export default function MentorProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [health, setHealth] = useState<HealthLog | null>(null);
  const [allHealth, setAllHealth] = useState<HealthLog[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [allSignals, setAllSignals] = useState<SignalStamp[]>([]);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [mentorName, setMentorName] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const user = await getCurrentUser();
      if (!user || user.role !== "mentor") {
        router.push("/login");
        return;
      }
      setMentorName(user.name);

      const response = await fetch(`/api/mentor/projects/${projectId}`, { cache: "no-store" });
      if (response.status === 403 || response.status === 404) {
        router.push("/mentor/projects");
        return;
      }
      if (!response.ok) throw new Error("Failed to load mentor project");

      const data = (await response.json()) as {
        project: Project;
        currentWeek: number;
        health: HealthLog | null;
        allHealth: HealthLog[];
        candidates: Candidate[];
        signals: Signal[];
        allSignals: SignalStamp[];
      };

      setProject(data.project);
      setCurrentWeek(data.currentWeek);
      setAllHealth(data.allHealth);
      setHealth(data.health);
      setCandidates(data.candidates);
      setSignals(data.signals);
      setAllSignals(data.allSignals);

      setLoading(false);
    };
    load();
  }, [projectId, router]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-100 rounded w-1/3" />
          <div className="h-48 bg-gray-100 rounded-2xl" />
          <div className="h-48 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!project) return null;

  const startDate = project.project_start_date
    ? new Date(project.project_start_date).toLocaleDateString("en-MY", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "TBD";

  const execSummary = health?.executive_summary as ExecutiveSummary | null | undefined;
  const riskRating = riskRatingInfo(execSummary?.risk_rating);
  const riskLevel = riskRating?.label.toLowerCase();
  const totalSignalsExpected = candidates.length * project.project_duration_weeks;
  const signalProgressPct =
    totalSignalsExpected > 0
      ? Math.round((allSignals.length / totalSignalsExpected) * 100)
      : 0;
  const signalCountByWeek = new Map<number, number>();
  for (const signal of allSignals) {
    signalCountByWeek.set(signal.week_no, (signalCountByWeek.get(signal.week_no) ?? 0) + 1);
  }

  // Missing submissions: candidates without signal this week
  const missingCandidateIds = candidates
    .filter((c) => !signals.find((s) => s.candidate_id === c.id))
    .map((c) => c.name);
  const mentorChatContext: MentorChatContext = {
    userName: mentorName,
    projectId: project.id,
    projectTitle: project.title,
    companyName: project.company_name,
    durationWeeks: project.project_duration_weeks,
  };

  return (
    <div className="max-w-5xl mx-auto px-8 py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/mentor/projects"
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
          aria-label="Back to projects"
        >
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </Link>

        <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-base flex items-center justify-center shrink-0 shadow-sm">
          {project.title[0]}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-bold text-gray-900 text-xl">{project.title}</h1>
            <span className="text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2.5 py-0.5">
              In Progress
            </span>
          </div>
          <p className="text-sm text-gray-500">
            {project.company_name} - Week {currentWeek} of {project.project_duration_weeks}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/mentor/weekly-signals?project=${project.id}`}
            className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm hover:bg-indigo-700 transition-colors"
          >
            <ClipboardList className="w-4 h-4" />
            Capture Signals
          </Link>
          <button
            type="button"
            onClick={() => setChatOpen((open) => !open)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors ${
              chatOpen
                ? "bg-indigo-100 text-indigo-700"
                : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Ask Thinkra
          </button>
        </div>
      </div>

      <div className="space-y-5">
        {/* Signal Progress */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-indigo-500" />
              <h2 className="font-semibold text-gray-900">Signal Progress</h2>
            </div>
            <span className="text-sm font-semibold text-indigo-700">
              {signalProgressPct}%
              {/* total signals = candidates × weeks logged */}
            </span>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
              <span>
                {allSignals.length} of {totalSignalsExpected} signals logged
              </span>
            </div>
            <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-gray-900"
                style={{ width: `${Math.min(signalProgressPct, 100)}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-3">
            {Array.from({ length: project.project_duration_weeks }, (_, i) => {
              const w = i + 1;
              return (
                <SignalWeekBox
                  key={w}
                  week={w}
                  done={signalCountByWeek.get(w) ?? 0}
                  total={candidates.length}
                  current={currentWeek}
                />
              );
            })}
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Complete
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" /> Partial
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-gray-200 inline-block" /> Not started
            </span>
          </div>
        </section>

        {/* Project Health */}
        {health && (
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-500" />
                <div>
                  <h2 className="font-semibold text-gray-900">Project Health</h2>
                  <p className="text-xs text-gray-400">Last analyzed: Week {health.week_number}</p>
                </div>
              </div>
              <span
                className={`text-xs font-semibold border rounded-full px-3 py-1 capitalize ${
                  healthTextColor[health.status] ?? "bg-gray-50 text-gray-500 border-gray-200"
                }`}
              >
                {health.status === "healthy" ? "Healthy" : health.status === "at_risk" ? "At Risk" : "Critical"}{" "}
                · {health.health_score}/100
              </span>
            </div>

            <p className="text-xs font-medium text-gray-500 mb-2">Health Score by Week</p>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 mb-4">
              {Array.from({ length: project.project_duration_weeks }, (_, i) => {
                const week = i + 1;
                const log = allHealth.find((h) => h.week_number === week);
                return (
                  <div key={week} className="flex flex-col items-center gap-1">
                    <div
                      className={`h-9 w-full rounded ${
                        log ? healthColor[log.status] ?? "bg-gray-200" : "bg-gray-100"
                      }`}
                      title={
                        log ? `Week ${week}: ${log.health_score}/100` : `Week ${week}: not analyzed`
                      }
                    />
                    <span className="text-[10px] text-gray-400">{week}</span>
                  </div>
                );
              })}
            </div>

            {health.summary && (
              <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 mb-4">
                <p className="text-sm text-gray-600">{health.summary}</p>
              </div>
            )}

            {health.red_flags && health.red_flags.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-red-600 flex items-center gap-1 mb-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Red Flags
                </p>
                <ul className="space-y-1">
                  {health.red_flags.map((f, i) => (
                    <li key={i} className="text-sm text-gray-600 flex gap-2">
                      <span className="text-red-400 shrink-0">•</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {health.recommendations && health.recommendations.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-amber-600 flex items-center gap-1 mb-1.5">
                  <CheckCircle className="w-3.5 h-3.5" /> Recommendations
                </p>
                <ul className="space-y-1">
                  {health.recommendations.map((r, i) => (
                    <li key={i} className="text-sm text-gray-600 flex gap-2">
                      <span className="text-amber-400 shrink-0">•</span> {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* Executive Summary */}
        {execSummary && (
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-indigo-500" />
              <div>
                <h2 className="font-semibold text-gray-900">
                  Week {health?.week_number} Executive Summary
                </h2>
                <p className="text-xs text-gray-400">AI-generated weekly report</p>
              </div>
            </div>

            <div className="space-y-4 text-sm text-gray-700">
              {execSummary.progress && (
                <div>
                  <p className="font-semibold text-gray-900 mb-1 text-xs uppercase tracking-wider text-indigo-600">
                    Combined Progress
                  </p>
                  {Array.isArray(execSummary.progress) ? (
                    <ul className="space-y-1">
                      {execSummary.progress.map((item: string, i: number) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-emerald-500 shrink-0">•</span> {item}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>{execSummary.progress}</p>
                  )}
                </div>
              )}

              {execSummary.todos && (
                <div>
                  <p className="font-semibold text-xs uppercase tracking-wider text-gray-500 mb-1">
                    To-Do List
                  </p>
                  {Array.isArray(execSummary.todos) ? (
                    <ul className="space-y-1">
                      {execSummary.todos.map((item: unknown, i: number) => (
                        <li key={i} className="flex gap-2 items-start">
                          <span className="text-gray-400 shrink-0 mt-0.5">—</span>
                          <span>
                            {typeof item === "string"
                              ? item
                              : typeof item === "object" && item && "task" in item
                              ? String((item as { task?: unknown }).task ?? JSON.stringify(item))
                              : JSON.stringify(item)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>{execSummary.todos}</p>
                  )}
                </div>
              )}

              {execSummary.blockers !== undefined && (
                <div>
                  <p className="font-semibold text-xs uppercase tracking-wider text-red-500 mb-1">
                    Blockers
                  </p>
                  <p className="text-gray-500 italic">
                    {summaryText(execSummary.blockers)}
                  </p>
                </div>
              )}

              {execSummary.discussion_points && (
                <div>
                  <p className="font-semibold text-xs uppercase tracking-wider text-gray-500 mb-1">
                    Key Discussion Points
                  </p>
                  {Array.isArray(execSummary.discussion_points) ? (
                    <ul className="space-y-1">
                      {execSummary.discussion_points.map((item: string, i: number) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-gray-400 shrink-0">•</span> {item}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>{execSummary.discussion_points}</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-gray-100">
                {riskRating && (
                  <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
                    <p className="text-xs text-gray-400 mb-1">Risk Rating</p>
                    <span
                      className={`inline-flex items-center gap-1.5 text-sm font-semibold capitalize ${
                        riskLevel === "green"
                          ? "text-emerald-600"
                          : riskLevel === "amber" || riskLevel === "yellow"
                          ? "text-amber-600"
                          : "text-red-600"
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-current inline-block" />
                      {riskRating.label}
                    </span>
                    {riskRating.detail && (
                      <p className="text-xs text-gray-400 mt-1 max-w-xs">
                        {riskRating.detail}
                      </p>
                    )}
                  </div>
                )}

                {missingCandidateIds.length > 0 && (
                  <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
                    <p className="text-xs text-gray-400 mb-1">Missing Submissions</p>
                    <div className="flex flex-wrap gap-1.5">
                      {missingCandidateIds.map((name) => (
                        <span
                          key={name}
                          className="text-xs font-medium bg-red-50 text-red-600 border border-red-200 rounded-full px-2 py-0.5"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Project info grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 lg:col-span-2">
            <h2 className="font-semibold text-gray-900 mb-3">Problem Overview</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{project.problem_statement}</p>
          </section>

          <div className="space-y-5">
            {/* Timeline */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-gray-400" />
                <h3 className="font-semibold text-gray-900 text-sm">Timeline</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400 text-xs uppercase tracking-wider">Duration</span>
                  <span className="font-medium text-gray-700">
                    {project.project_duration_weeks} weeks
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-xs uppercase tracking-wider">Kickoff</span>
                  <span className="font-medium text-gray-700">{startDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-xs uppercase tracking-wider">Max Candidates</span>
                  <span className="font-medium text-gray-700">{project.max_candidates}</span>
                </div>
              </div>
            </div>

            {/* Company */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="w-4 h-4 text-gray-400" />
                <h3 className="font-semibold text-gray-900 text-sm">Company</h3>
              </div>
              <p className="font-medium text-gray-700 text-sm mb-1">{project.company_name}</p>
              {project.company_website && (
                <a
                  href={project.company_website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-indigo-600 flex items-center gap-1 hover:underline"
                >
                  {project.company_website.replace(/^https?:\/\//, "")}
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </div>

        {project.project_scope && (
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 lg:w-[calc(66.666%_-_0.875rem)]">
            <h2 className="font-semibold text-gray-900 mb-2">Candidates&apos; Mission</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{project.project_scope}</p>
          </section>
        )}

        {project.requirements && (
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 lg:w-[calc(66.666%_-_0.875rem)]">
            <h2 className="font-semibold text-gray-900 mb-2">Technical Requirements</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{project.requirements}</p>
          </section>
        )}

        {/* Candidates */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 lg:w-[calc(66.666%_-_0.875rem)]">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-indigo-500" />
            <h2 className="font-semibold text-gray-900">Confirmed Candidates</h2>
            <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-2 py-0.5">
              {candidates.length} signed
            </span>
          </div>

          <div className="space-y-3">
            {candidates.map((c) => {
              const signal = signals.find((s) => s.candidate_id === c.id);
              const initials = c.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

              return (
                <div
                  key={c.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                      {signal ? (
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" title="Signal pending" />
                      )}
                    </div>
                    <p className="text-xs text-gray-400">
                      {c.institution}
                      {c.field_of_study ? ` · ${c.field_of_study}` : ""}
                    </p>
                  </div>
                  {c.proposal_url && (
                    <a
                      href={c.proposal_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-medium text-indigo-600 flex items-center gap-1 hover:underline shrink-0"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      View Proposal
                    </a>
                  )}
                  <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5 shrink-0">
                    Signed
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
      <MentorChat
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        context={mentorChatContext}
      />
    </div>
  );
}
