"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle, ChevronDown, Plus } from "lucide-react";
import MentorChat from "@/components/MentorChat";
import MissionSection from "@/components/MissionSection";
import ProblemOverview from "@/components/ProblemOverview";
import Sidebar from "@/components/Sidebar";
import SubmitProposal from "@/components/SubmitProposal";
import Topbar from "@/components/Topbar";
import { createClient } from "@/lib/supabase/client";

interface Project {
  id: string;
  title: string;
  company_name: string;
  company_industry: string;
  company_pic_name: string | null;
  company_pic_email: string | null;
  company_website: string | null;
  problem_statement: string;
  project_scope: string | null;
  requirements: string | null;
  project_duration_weeks: number;
  max_candidates: number;
  status: "open" | "closed" | "draft" | "in_progress";
  submission_end_date: string | null;
  project_start_date: string | null;
  compensation_amount: number | null;
}

interface Proposal {
  id: string;
  status: string;
  ai_score: number | null;
  submitted_at: string;
  proposal_pdf_url: string | null;
}

interface WeeklyLog {
  week_number: number;
  tasks_completed: string;
  tasks_planned: string;
  blockers: string | null;
  submitted_at: string;
}

function formatCurrency(value: number | null) {
  if (!value) return "RM 0";
  return `RM ${value.toLocaleString("en-MY")}`;
}

function formatDeadline(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
  });
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 1)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function WeeklyLogCard({ log }: { log: WeeklyLog }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((current) => !current)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-lg flex items-center justify-center text-sm font-bold shrink-0">
            {log.week_number}
          </span>
          <div className="min-w-0">
            <span className="font-medium text-gray-800 text-sm">Week {log.week_number}</span>
            <p className="text-[11px] text-gray-400 truncate">
              {new Date(log.submitted_at).toLocaleDateString("en-MY", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
          {log.blockers && (
            <span className="bg-red-100 text-red-500 text-xs px-2 py-0.5 rounded-full shrink-0">Blocker</span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-gray-100 p-4 space-y-3 bg-gray-50">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Completed</p>
            <p className="text-sm text-gray-700">{log.tasks_completed}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Planned Next</p>
            <p className="text-sm text-gray-700">{log.tasks_planned}</p>
          </div>
          {log.blockers && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-red-500 uppercase mb-1">Blocker</p>
              <p className="text-sm text-red-700">{log.blockers}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const rawProjectId = params?.id;
  const projectId = Array.isArray(rawProjectId) ? rawProjectId[0] : rawProjectId;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [myProposal, setMyProposal] = useState<Proposal | null>(null);
  const [myLogs, setMyLogs] = useState<WeeklyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pdfUrl, setPdfUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [logForm, setLogForm] = useState({ tasks_completed: "", tasks_planned: "", blockers: "" });
  const [submittingLog, setSubmittingLog] = useState(false);

  useEffect(() => {
    async function loadProject() {
      if (!projectId) return;

      setLoading(true);
      setError(null);
      const supabase = createClient();

      const [{ data: projectData, error: projectError }, { data: userData }] = await Promise.all([
        supabase.from("project").select("*").eq("id", projectId).maybeSingle(),
        supabase.auth.getUser(),
      ]);

      if (projectError) {
        setError(projectError.message);
        setLoading(false);
        return;
      }

      setProject(projectData);

      const user = userData.user;
      if (user && projectData) {
        const { data: proposalData } = await supabase
          .from("proposal")
          .select("id, status, ai_score, submitted_at, proposal_pdf_url")
          .eq("project_id", projectId)
          .eq("candidate_id", user.id)
          .maybeSingle();

        setMyProposal(proposalData);

        if (proposalData?.status === "confirmed") {
          const { data: logsData } = await supabase
            .from("candidate_weekly_log")
            .select("week_number, tasks_completed, tasks_planned, blockers, submitted_at")
            .eq("project_id", projectId)
            .eq("candidate_id", user.id)
            .order("week_number", { ascending: false });

          setMyLogs(logsData ?? []);
        }
      }

      setLoading(false);
    }

    loadProject();
  }, [projectId]);

  async function handleSubmitProposal() {
    if (!projectId || !pdfUrl.trim()) return;

    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Please log in before submitting a proposal.");
      setSubmitting(false);
      return;
    }

    const submittedAt = new Date().toISOString();
    const { error: submitError } = await supabase.from("proposal").insert({
      project_id: projectId,
      candidate_id: user.id,
      proposal_pdf_url: pdfUrl,
      proposal_video_url: videoUrl || null,
      status: "submitted",
      submitted_at: submittedAt,
    });

    if (submitError) {
      setError(submitError.message);
    } else {
      setSubmitted(true);
      setMyProposal({
        id: "new",
        status: "submitted",
        ai_score: null,
        submitted_at: submittedAt,
        proposal_pdf_url: pdfUrl,
      });
    }

    setSubmitting(false);
  }

  async function handleSubmitLog() {
    if (!projectId || !logForm.tasks_completed.trim() || !logForm.tasks_planned.trim()) return;

    setSubmittingLog(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Please log in before submitting a weekly log.");
      setSubmittingLog(false);
      return;
    }

    const nextWeek = myLogs.length > 0 ? Math.max(...myLogs.map((log) => log.week_number)) + 1 : 1;
    const submittedAt = new Date().toISOString();

    const { error: logError } = await supabase.from("candidate_weekly_log").insert({
      project_id: projectId,
      candidate_id: user.id,
      submitted_by: user.id,
      week_number: nextWeek,
      tasks_completed: logForm.tasks_completed,
      tasks_planned: logForm.tasks_planned,
      blockers: logForm.blockers || null,
      submitted_at: submittedAt,
    });

    if (logError) {
      setError(logError.message);
    } else {
      setMyLogs([{ week_number: nextWeek, ...logForm, submitted_at: submittedAt }, ...myLogs]);
      setLogForm({ tasks_completed: "", tasks_planned: "", blockers: "" });
    }

    setSubmittingLog(false);
  }

  const isConfirmed = myProposal?.status === "confirmed";
  const isOpen = project?.status === "open";
  const topbarDeadline = project?.submission_end_date
    ? `Due ${formatDeadline(project.submission_end_date)}`
    : null;

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
        <Topbar
          onToggleChat={() => setChatOpen((open) => !open)}
          onToggleSidebar={() => setSidebarOpen((open) => !open)}
          chatOpen={chatOpen}
          title={project?.title}
          subtitle={project ? `${project.company_name} - ${project.company_industry}` : undefined}
          durationLabel={project ? `${project.project_duration_weeks} weeks` : undefined}
          deadlineLabel={topbarDeadline}
          avatarLabel={project ? initials(project.company_name) : undefined}
        />

        <div className="flex flex-1 overflow-hidden relative">
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="p-4 md:p-6 flex flex-col gap-4 md:gap-5 w-full mx-auto">
              <button
                onClick={() => router.back()}
                className="w-fit text-[13px] font-medium text-gray-500 hover:text-gray-900 transition-colors"
              >
                Back to Projects
              </button>

              {loading ? (
                <div className="bg-white border border-gray-100 rounded-xl p-8 text-center text-sm text-gray-400 animate-pulse">
                  Loading project...
                </div>
              ) : !project ? (
                <div className="bg-white border border-gray-100 rounded-xl p-8 text-center text-sm text-gray-400">
                  Project not found.
                </div>
              ) : (
                <>
                  <div
                    className={
                      isConfirmed
                        ? "bg-linear-to-br from-indigo-600 to-indigo-800 rounded-xl p-4 md:p-6 text-white"
                        : "bg-white border border-gray-100 rounded-xl p-4 md:p-6"
                    }
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={
                          isConfirmed
                            ? "w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0"
                            : "w-11 h-11 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0"
                        }
                      >
                        <span className={isConfirmed ? "text-white font-bold text-base" : "text-indigo-600 font-bold text-base"}>
                          {initials(project.company_name)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={isConfirmed ? "text-indigo-200 text-[11px] font-semibold tracking-widest uppercase" : "text-[11px] font-semibold tracking-widest text-gray-400 uppercase"}>
                          {project.company_industry}
                        </p>
                        <h1 className={isConfirmed ? "text-white font-bold text-[18px] mt-0.5" : "text-[18px] font-bold text-gray-900 leading-snug mt-0.5"}>
                          {project.title}
                        </h1>
                        <p className={isConfirmed ? "text-indigo-100 text-[13px] mt-1" : "text-[13px] text-gray-500 mt-1"}>
                          {project.company_name} - {formatCurrency(project.compensation_amount)} - {project.max_candidates} spots
                        </p>
                      </div>
                      {isConfirmed && (
                        <span className="bg-white/20 text-white text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full">
                          Active Project
                        </span>
                      )}
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-2 text-sm text-red-700">
                      <AlertCircle size={16} className="mt-0.5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {!isConfirmed && (
                    <SubmitProposal
                      proposal={myProposal}
                      isOpen={isOpen}
                      pdfUrl={pdfUrl}
                      videoUrl={videoUrl}
                      submitting={submitting}
                      submitted={submitted}
                      onPdfUrlChange={setPdfUrl}
                      onVideoUrlChange={setVideoUrl}
                      onSubmit={handleSubmitProposal}
                    />
                  )}

                  <ProblemOverview
                    problemStatement={project.problem_statement}
                    submissionEndDate={project.submission_end_date}
                    projectStartDate={project.project_start_date}
                    durationWeeks={project.project_duration_weeks}
                  />

                  <MissionSection projectScope={project.project_scope} requirements={project.requirements} />

                  {isConfirmed && (
                    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
                      <div className="bg-white border border-gray-100 rounded-xl p-4 md:p-5 h-fit">
                        <h2 className="text-[15px] font-medium text-gray-900 mb-4 flex items-center gap-2">
                          <Plus size={15} className="text-indigo-600" />
                          Submit Weekly Log
                        </h2>
                        <div className="space-y-3">
                          <textarea
                            rows={3}
                            className="w-full text-sm border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 resize-none"
                            placeholder="What did you complete this week?"
                            value={logForm.tasks_completed}
                            onChange={(event) =>
                              setLogForm((form) => ({ ...form, tasks_completed: event.target.value }))
                            }
                          />
                          <textarea
                            rows={3}
                            className="w-full text-sm border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 resize-none"
                            placeholder="What will you do next week?"
                            value={logForm.tasks_planned}
                            onChange={(event) =>
                              setLogForm((form) => ({ ...form, tasks_planned: event.target.value }))
                            }
                          />
                          <textarea
                            rows={2}
                            className="w-full text-sm border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 resize-none"
                            placeholder="Blockers (optional)"
                            value={logForm.blockers}
                            onChange={(event) =>
                              setLogForm((form) => ({ ...form, blockers: event.target.value }))
                            }
                          />
                          <button
                            onClick={handleSubmitLog}
                            disabled={
                              submittingLog ||
                              !logForm.tasks_completed.trim() ||
                              !logForm.tasks_planned.trim()
                            }
                            className="w-full bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white font-medium text-[13px] py-2 rounded-lg transition-colors"
                          >
                            {submittingLog ? "Submitting..." : "Submit Log"}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h2 className="text-[15px] font-medium text-gray-900">Log History</h2>
                        {myLogs.length === 0 ? (
                          <div className="bg-white border border-gray-100 rounded-xl p-8 text-center text-gray-400 text-sm">
                            No logs yet. Submit your first weekly log.
                          </div>
                        ) : (
                          myLogs.map((log) => <WeeklyLogCard key={log.week_number} log={log} />)
                        )}
                      </div>
                    </div>
                  )}

                  {project.status === "closed" && !isConfirmed && (
                    <div className="bg-white border border-gray-100 rounded-xl p-6 text-center">
                      <p className="text-gray-500 text-sm">This project is no longer accepting applications.</p>
                    </div>
                  )}

                  <div className="bg-white border border-gray-100 rounded-xl p-4 md:p-6">
                    <h2 className="text-[15px] font-medium text-gray-900 mb-3">Company Contact</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-[11px] text-gray-400 mb-1">Contact Person</p>
                        <p className="text-[13px] font-medium text-gray-800">{project.company_pic_name ?? "TBD"}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-[11px] text-gray-400 mb-1">Email</p>
                        <p className="text-[13px] font-medium text-gray-800 break-words">{project.company_pic_email ?? "TBD"}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-[11px] text-gray-400 mb-1">Website</p>
                        {project.company_website ? (
                          <a
                            href={project.company_website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[13px] font-medium text-indigo-700 hover:text-indigo-900 break-words"
                          >
                            {project.company_website.replace(/^https?:\/\//, "")}
                          </a>
                        ) : (
                          <p className="text-[13px] font-medium text-gray-800">TBD</p>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <MentorChat isOpen={chatOpen} onClose={() => setChatOpen(false)} />
        </div>
      </div>
    </div>
  );
}
