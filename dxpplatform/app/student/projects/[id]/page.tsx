"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Project {
  id: string;
  title: string;
  company_name: string;
  company_industry: string;
  company_pic_name: string;
  company_pic_email: string;
  company_website: string;
  problem_statement: string;
  project_scope: string;
  requirements: string;
  project_duration_weeks: number;
  max_candidates: number;
  status: "open" | "closed" | "draft" | "in_progress";
  submission_end_date: string | null;
  project_start_date: string | null;
  compensation_amount: number;
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

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    submitted: { label: "Submitted", cls: "bg-blue-50 text-blue-600 border border-blue-200" },
    selected: { label: "Selected", cls: "bg-green-50 text-green-600 border border-green-200" },
    confirmed: { label: "Confirmed", cls: "bg-indigo-50 text-indigo-600 border border-indigo-200" },
    rejected: { label: "Not Selected", cls: "bg-red-50 text-red-500 border border-red-200" },
    interview_scheduled: { label: "Interview Scheduled", cls: "bg-yellow-50 text-yellow-600 border border-yellow-200" },
    interviewed: { label: "Interviewed", cls: "bg-purple-50 text-purple-600 border border-purple-200" },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-500" };
  return <span className={`text-xs font-semibold px-3 py-1 rounded-full ${cls}`}>{label}</span>;
}

// ─── Markdown renderer (simple) ───────────────────────────────────────────────
function ProseContent({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="text-sm text-gray-600 leading-relaxed space-y-2">
      {lines.map((line, i) => {
        if (line.startsWith("## "))
          return <h3 key={i} className="font-bold text-gray-900 text-base mt-4">{line.slice(3)}</h3>;
        if (line.startsWith("# "))
          return <h2 key={i} className="font-bold text-gray-900 text-lg mt-4">{line.slice(2)}</h2>;
        if (line.startsWith("- "))
          return <li key={i} className="ml-4 list-disc">{line.slice(2).replace(/\*\*(.+?)\*\*/g, "$1")}</li>;
        if (line.startsWith("> "))
          return <blockquote key={i} className="border-l-4 border-indigo-200 pl-4 italic text-gray-500">{line.slice(2)}</blockquote>;
        if (!line.trim()) return <div key={i} className="h-1" />;
        return (
          <p key={i}>
            {line.replace(/\*\*(.+?)\*\*/g, (_, t) => `<strong>${t}</strong>`)
              .split(/(<strong>.+?<\/strong>)/)
              .map((chunk, j) =>
                chunk.startsWith("<strong>")
                  ? <strong key={j}>{chunk.replace(/<\/?strong>/g, "")}</strong>
                  : chunk
              )}
          </p>
        );
      })}
    </div>
  );
}

// ─── Weekly Log Entry ─────────────────────────────────────────────────────────
function WeeklyLogCard({ log }: { log: WeeklyLog }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-lg flex items-center justify-center text-sm font-bold">
            {log.week_number}
          </span>
          <span className="font-medium text-gray-800 text-sm">Week {log.week_number}</span>
          {log.blockers && (
            <span className="bg-red-100 text-red-500 text-xs px-2 py-0.5 rounded-full">Blocker</span>
          )}
        </div>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
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

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id as string;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [myProposal, setMyProposal] = useState<Proposal | null>(null);
  const [myLogs, setMyLogs] = useState<WeeklyLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Proposal form state
  const [pdfUrl, setPdfUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // New log form
  const [logForm, setLogForm] = useState({ tasks_completed: "", tasks_planned: "", blockers: "" });
  const [submittingLog, setSubmittingLog] = useState(false);

  useEffect(() => {
    async function load() {
      if (!projectId) return;
      const supabase = createClient();

      const [{ data: proj }, { data: { user } }] = await Promise.all([
        supabase
          .from("project")
          .select("*")
          .eq("id", projectId)
          .single(),
        supabase.auth.getUser(),
      ]);

      setProject(proj);

      if (user) {
        const { data: proposal } = await supabase
          .from("proposal")
          .select("id, status, ai_score, submitted_at, proposal_pdf_url")
          .eq("project_id", projectId)
          .eq("candidate_id", user.id)
          .maybeSingle();

        setMyProposal(proposal);

        // If confirmed, load weekly logs
        if (proposal?.status === "confirmed") {
          const { data: logs } = await supabase
            .from("candidate_weekly_log")
            .select("week_number, tasks_completed, tasks_planned, blockers, submitted_at")
            .eq("project_id", projectId)
            .eq("candidate_id", user.id)
            .order("week_number", { ascending: false });

          setMyLogs(logs ?? []);
        }
      }

      setLoading(false);
    }
    load();
  }, [projectId]);

  async function handleSubmitProposal() {
    if (!pdfUrl.trim()) return;
    setSubmitting(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("proposal").insert({
      project_id: projectId,
      candidate_id: user.id,
      proposal_pdf_url: pdfUrl,
      proposal_video_url: videoUrl || null,
      status: "submitted",
      submitted_at: new Date().toISOString(),
    });

    setSubmitted(true);
    setSubmitting(false);
    setMyProposal({ id: "new", status: "submitted", ai_score: null, submitted_at: new Date().toISOString(), proposal_pdf_url: pdfUrl });
  }

  async function handleSubmitLog() {
    if (!logForm.tasks_completed.trim() || !logForm.tasks_planned.trim()) return;
    setSubmittingLog(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const nextWeek = myLogs.length > 0 ? Math.max(...myLogs.map((l) => l.week_number)) + 1 : 1;

    await supabase.from("candidate_weekly_log").insert({
      project_id: projectId,
      candidate_id: user.id,
      submitted_by: user.id,
      week_number: nextWeek,
      tasks_completed: logForm.tasks_completed,
      tasks_planned: logForm.tasks_planned,
      blockers: logForm.blockers || null,
      submitted_at: new Date().toISOString(),
    });

    setMyLogs([{ week_number: nextWeek, ...logForm, submitted_at: new Date().toISOString() }, ...myLogs]);
    setLogForm({ tasks_completed: "", tasks_planned: "", blockers: "" });
    setSubmittingLog(false);
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar isOpen={false} onClose={() => {}} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-400 animate-pulse">Loading project...</div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar isOpen={false} onClose={() => {}} />
        <div className="flex-1 flex items-center justify-center text-gray-400">Project not found.</div>
      </div>
    );
  }

  const isConfirmed = myProposal?.status === "confirmed";
  const hasApplied = !!myProposal;
  const isOpen = project.status === "open";

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-col flex-1 min-w-0">
        <Topbar
          onToggleChat={() => setChatOpen((o) => !o)}
          onToggleSidebar={() => setSidebarOpen((o) => !o)}
          chatOpen={chatOpen}
        />

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* Back */}
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Projects
            </button>

            {/* ── ACTIVE PROJECT HEADER ─────────────────────────────── */}
            {isConfirmed ? (
              <div className="bg-linear-to-br from-indigo-600 to-indigo-800 rounded-2xl p-6 text-white">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <span className="bg-white/20 text-white text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full">
                      Active Project
                    </span>
                    <h1 className="text-2xl font-bold mt-3">{project.title}</h1>
                    <p className="text-indigo-200 mt-1">{project.company_name} · {project.company_industry}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="bg-white/20 text-white text-sm px-4 py-2 rounded-xl">
                      RM {project.compensation_amount.toLocaleString()}
                    </span>
                    <span className="text-indigo-200 text-xs">{project.project_duration_weeks} weeks</span>
                  </div>
                </div>
              </div>
            ) : (
              /* ── OPEN PROJECT HEADER ── */
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                    <span className="text-indigo-600 font-bold text-lg">
                      {project.company_name[0]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">
                      {project.company_industry}
                    </p>
                    <h1 className="text-xl font-bold text-gray-900 mt-1">{project.title}</h1>
                    <p className="text-sm text-gray-500 mt-0.5">{project.company_name}</p>
                  </div>
                  {hasApplied && myProposal && <StatusBadge status={myProposal.status} />}
                </div>

                <div className="flex flex-wrap gap-3 mt-5 pt-5 border-t border-gray-100">
                  <span className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 rounded-full px-3 py-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {project.project_duration_weeks} weeks
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 rounded-full px-3 py-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {project.max_candidates} spots
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 rounded-full px-3 py-1.5">
                    💰 RM {project.compensation_amount.toLocaleString()}
                  </span>
                  {project.submission_end_date && (
                    <span className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 rounded-full px-3 py-1.5">
                      📅 Deadline:{" "}
                      {new Date(project.submission_end_date).toLocaleDateString("en-MY", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* ── CONFIRMED: WEEKLY LOGS ─────────────────────────────── */}
            {isConfirmed && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Submit new log */}
                <div className="lg:col-span-1">
                  <div className="bg-white rounded-2xl border border-gray-200 p-5 sticky top-6">
                    <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Submit Weekly Log
                    </h2>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">This week I completed</label>
                        <textarea
                          rows={3}
                          className="w-full text-sm border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                          placeholder="What did you accomplish this week?"
                          value={logForm.tasks_completed}
                          onChange={(e) => setLogForm((f) => ({ ...f, tasks_completed: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Next week I plan to</label>
                        <textarea
                          rows={3}
                          className="w-full text-sm border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                          placeholder="What are your plans for next week?"
                          value={logForm.tasks_planned}
                          onChange={(e) => setLogForm((f) => ({ ...f, tasks_planned: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Blockers (optional)</label>
                        <textarea
                          rows={2}
                          className="w-full text-sm border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                          placeholder="Any blockers or help needed?"
                          value={logForm.blockers}
                          onChange={(e) => setLogForm((f) => ({ ...f, blockers: e.target.value }))}
                        />
                      </div>
                      <button
                        onClick={handleSubmitLog}
                        disabled={submittingLog || !logForm.tasks_completed.trim() || !logForm.tasks_planned.trim()}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors"
                      >
                        {submittingLog ? "Submitting..." : "Submit Log"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Log history */}
                <div className="lg:col-span-2 space-y-3">
                  <h2 className="font-bold text-gray-900">Log History</h2>
                  {myLogs.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
                      No logs yet. Submit your first weekly log!
                    </div>
                  ) : (
                    myLogs.map((log) => <WeeklyLogCard key={log.week_number} log={log} />)
                  )}
                </div>
              </div>
            )}

            {/* ── PROJECT DETAILS ────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
              <div>
                <h2 className="font-bold text-gray-900 mb-3">Problem Statement</h2>
                <ProseContent text={project.problem_statement} />
              </div>

              <div className="border-t border-gray-100 pt-5">
                <h2 className="font-bold text-gray-900 mb-3">Project Scope</h2>
                <p className="text-sm text-gray-600 leading-relaxed">{project.project_scope}</p>
              </div>

              <div className="border-t border-gray-100 pt-5">
                <h2 className="font-bold text-gray-900 mb-3">Requirements</h2>
                <div className="flex flex-wrap gap-2">
                  {project.requirements.split(",").map((req, i) => (
                    <span key={i} className="bg-indigo-50 text-indigo-700 text-xs font-medium px-3 py-1.5 rounded-full border border-indigo-100">
                      {req.trim()}
                    </span>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-5">
                <h2 className="font-bold text-gray-900 mb-3">Company Contact</h2>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 mb-1">Contact Person</p>
                    <p className="text-sm font-medium text-gray-800">{project.company_pic_name}</p>
                  </div>
                  <div className="flex-1 bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 mb-1">Email</p>
                    <p className="text-sm font-medium text-gray-800">{project.company_pic_email}</p>
                  </div>
                  {project.company_website && (
                    <div className="flex-1 bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400 mb-1">Website</p>
                      <a href={project.company_website} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-indigo-600 hover:underline">
                        {project.company_website.replace("https://", "")}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── PROPOSAL SECTION ───────────────────────────────────── */}
            {!isConfirmed && isOpen && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="font-bold text-gray-900 mb-4">
                  {hasApplied ? "Your Proposal" : "Submit Your Proposal"}
                </h2>

                {hasApplied && myProposal ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <StatusBadge status={myProposal.status} />
                      {myProposal.ai_score && (
                        <span className="text-xs text-gray-500">
                          AI Score: <strong className="text-gray-800">{myProposal.ai_score}/100</strong>
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      Submitted on{" "}
                      {new Date(myProposal.submitted_at).toLocaleDateString("en-MY", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    {myProposal.proposal_pdf_url && (
                      <a
                        href={`/${myProposal.proposal_pdf_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:underline"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        View Proposal PDF
                      </a>
                    )}
                    {myProposal.status === "rejected" && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                        <p className="text-sm text-red-600">Your proposal was not selected for this project. You may apply to other open projects.</p>
                      </div>
                    )}
                    {myProposal.status === "selected" && (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                        <p className="text-sm text-green-700 font-medium">🎉 Congratulations! Your proposal has been selected. Please await further instructions from the admin.</p>
                      </div>
                    )}
                    {myProposal.status === "interview_scheduled" && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                        <p className="text-sm text-yellow-700 font-medium">📅 An interview has been scheduled. Check your email for details.</p>
                      </div>
                    )}
                  </div>
                ) : submitted ? (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="font-semibold text-green-800">Proposal Submitted!</p>
                    <p className="text-sm text-green-600 mt-1">We'll review it and get back to you soon.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500">
                      Upload your proposal PDF and optionally add a video pitch link to stand out.
                    </p>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase block mb-1.5">
                        Proposal PDF URL <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="url"
                        placeholder="https://drive.google.com/..."
                        value={pdfUrl}
                        onChange={(e) => setPdfUrl(e.target.value)}
                        className="w-full text-sm border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase block mb-1.5">
                        Video Pitch URL (optional)
                      </label>
                      <input
                        type="url"
                        placeholder="https://youtube.com/..."
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        className="w-full text-sm border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      />
                    </div>
                    <button
                      onClick={handleSubmitProposal}
                      disabled={submitting || !pdfUrl.trim()}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
                    >
                      {submitting ? "Submitting..." : "Submit Proposal →"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Closed project notice */}
            {project.status === "closed" && !isConfirmed && (
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 text-center">
                <p className="text-gray-500 text-sm">This project is no longer accepting applications.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}