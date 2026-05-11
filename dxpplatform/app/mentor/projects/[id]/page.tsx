"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUser } from "@/lib/auth/current-user";
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

type AgreementRow = {
  candidate_id: string;
  group_id?: string | null;
  candidate: { id: string; name: string | null; email: string | null } | null;
  candidate_profile: { institution: string | null; field_of_study: string | null } | null;
};

type ProposalRow = {
  candidate_id: string | null;
  group_id: string | null;
  proposal_pdf_url: string | null;
};

type ExecutiveSummary = {
  progress?: string | string[];
  todos?: string | unknown[];
  blockers?: unknown;
  discussion_points?: string | string[];
  risk_rating?: string;
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

function WeekBar({
  week,
  status,
  current,
}: {
  week: number;
  status?: string;
  current: number;
}) {
  const isFuture = week > current;
  const color = status
    ? healthColor[status] ?? "bg-gray-300"
    : isFuture
    ? "bg-gray-200"
    : "bg-gray-300";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`w-10 h-8 rounded ${color}`} />
      <span className="text-[10px] text-gray-400">{week}</span>
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

export default function MentorProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [health, setHealth] = useState<HealthLog | null>(null);
  const [allHealth, setAllHealth] = useState<HealthLog[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const user = await getCurrentUser();
      if (!user || user.role !== "mentor") {
        router.push("/login");
        return;
      }

      // Verify assignment
      const { data: assignment } = await supabase
        .from("mentor_assignment")
        .select("id")
        .eq("project_id", projectId)
        .eq("mentor_id", user.id)
        .single();
      if (!assignment) {
        router.push("/mentor/projects");
        return;
      }

      // Project
      const { data: proj } = await supabase
        .from("project")
        .select(
          "id, title, company_name, company_website, problem_statement, project_scope, requirements, project_start_date, project_duration_weeks, status, max_candidates"
        )
        .eq("id", projectId)
        .single();
      if (!proj) return;
      setProject(proj);

      const startDate = proj.project_start_date ? new Date(proj.project_start_date) : null;
      const today = new Date();
      const week = startDate
        ? Math.min(
            Math.max(
              Math.ceil((today.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)),
              1
            ),
            proj.project_duration_weeks
          )
        : 1;
      setCurrentWeek(week);

      // Health logs
      const { data: healthLogs } = await supabase
        .from("project_health_log")
        .select("week_number, health_score, status, red_flags, recommendations, summary, executive_summary")
        .eq("project_id", projectId)
        .order("week_number", { ascending: true });
      setAllHealth(healthLogs ?? []);

      const latestHealth = healthLogs?.slice(-1)[0] ?? null;
      setHealth(latestHealth);

      // Candidates via signed_agreement
      const { data: agreements } = await supabase
        .from("signed_agreement")
        .select(
          `candidate_id, 
           candidate:user!signed_agreement_candidate_id_fkey(id, name, email),
           candidate_profile:candidate_profile(institution, field_of_study)`
        )
        .eq("project_id", projectId);

      // Also get proposals for "View Proposal" links
      const { data: proposals } = await supabase
        .from("proposal")
        .select("id, candidate_id, group_id, proposal_pdf_url, status")
        .eq("project_id", projectId)
        .in("status", ["confirmed", "selected"]);

      const proposalRows = (proposals ?? []) as unknown as ProposalRow[];
      const candidateList: Candidate[] = ((agreements ?? []) as unknown as AgreementRow[]).map((a) => {
        const proposal = proposalRows.find(
          (p) =>
            p.candidate_id === a.candidate_id ||
            (p.group_id && a.group_id && p.group_id === a.group_id)
        );
        return {
          id: a.candidate?.id ?? a.candidate_id,
          name: a.candidate?.name ?? "Unknown",
          email: a.candidate?.email ?? "",
          institution: a.candidate_profile?.institution ?? null,
          field_of_study: a.candidate_profile?.field_of_study ?? null,
          proposal_url: proposal?.proposal_pdf_url ?? null,
          is_group: false,
          group_name: null,
        };
      });
      setCandidates(candidateList);

      // Signals for current week
      const { data: sigs } = await supabase
        .from("mentor_weekly_signal")
        .select("candidate_id, week_no, prepared, clarity, follow_through, prompting, no_show, observation")
        .eq("project_id", projectId)
        .eq("week_no", week)
        .eq("mentor_id", user.id);
      setSignals(sigs ?? []);

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

  // Missing submissions: candidates without signal this week
  const missingCandidateIds = candidates
    .filter((c) => !signals.find((s) => s.candidate_id === c.id))
    .map((c) => c.name);

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/mentor/projects"
          className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </Link>

        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 font-bold text-base flex items-center justify-center shrink-0">
          {project.title[0]}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-bold text-gray-900 text-xl">{project.title}</h1>
            <span className="text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2.5 py-0.5">
              In Progress
            </span>
          </div>
          <p className="text-sm text-gray-500">
            {project.company_name} · Week {currentWeek} of {project.project_duration_weeks}
          </p>
        </div>

        <Link
          href={`/mentor/weekly-signals?project=${project.id}`}
          className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors"
        >
          <ClipboardList className="w-4 h-4" />
          Capture Signals
        </Link>
      </div>

      <div className="space-y-5">
        {/* Signal Progress */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-indigo-500" />
              <h2 className="font-semibold text-gray-900">Signal Progress</h2>
            </div>
            <span className="text-sm text-gray-500">
              {/* total signals = candidates × weeks logged */}
            </span>
          </div>

          {/* Week bars */}
          <div className="flex gap-2 mb-3 flex-wrap">
            {Array.from({ length: project.project_duration_weeks }, (_, i) => {
              const w = i + 1;
              const log = allHealth.find((h) => h.week_number === w);
              return (
                <WeekBar
                  key={w}
                  week={w}
                    status={log?.status}
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

            {/* Health score bars */}
            <div className="flex gap-1.5 mb-3 flex-wrap">
              {allHealth.map((h) => (
                <div
                  key={h.week_number}
                  className={`h-8 w-10 rounded ${healthColor[h.status] ?? "bg-gray-200"}`}
                  title={`Week ${h.week_number}: ${h.health_score}/100`}
                />
              ))}
            </div>

            {health.summary && (
              <p className="text-sm text-gray-600 mb-4">{health.summary}</p>
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

              <div className="flex gap-6 pt-2 border-t border-gray-100">
                {execSummary.risk_rating && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Risk Rating</p>
                    <span
                      className={`inline-flex items-center gap-1.5 text-sm font-semibold capitalize ${
                        execSummary.risk_rating?.toLowerCase() === "green"
                          ? "text-emerald-600"
                          : execSummary.risk_rating?.toLowerCase() === "amber"
                          ? "text-amber-600"
                          : "text-red-600"
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-current inline-block" />
                      {execSummary.risk_rating}
                    </span>
                  </div>
                )}

                {missingCandidateIds.length > 0 && (
                  <div>
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
        <div className="grid grid-cols-2 gap-5">
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
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
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-2">Candidates&apos; Mission</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{project.project_scope}</p>
          </section>
        )}

        {project.requirements && (
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-2">Technical Requirements</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{project.requirements}</p>
          </section>
        )}

        {/* Candidates */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
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
    </div>
  );
}
