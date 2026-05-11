"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  EyeOff,
  Save,
  CheckCircle,
  Plus,
  X,
  Radio,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Project = {
  id: string;
  title: string;
  company_name: string;
  project_duration_weeks: number;
  project_start_date: string | null;
};

type Candidate = {
  id: string;
  name: string;
  email: string;
};

type SignalForm = {
  prepared: "yes" | "partial" | "no" | null;
  clarity: "yes" | "some_gaps" | "no" | null;
  follow_through: "yes" | "partially" | "no" | null;
  prompting: boolean | null;
  no_show: boolean;
  observation: string;
  exceptions: ExceptionEvent[];
};

type ExceptionEvent = {
  id?: string;
  event_type: string;
  notes: string;
};

const EXCEPTION_TYPES = [
  { value: "missed_deadline", label: "Missed Deadline" },
  { value: "client_clarification_needed", label: "Client Clarification Needed" },
  { value: "mentor_stepped_in", label: "Mentor Stepped In" },
  { value: "blocked_over_48h", label: "Blocked Over 48h" },
];

function initForm(): SignalForm {
  return {
    prepared: null,
    clarity: null,
    follow_through: null,
    prompting: null,
    no_show: false,
    observation: "",
    exceptions: [],
  };
}

function RadioGroup<T extends string>({
  label,
  description,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <div className="mb-2">
        <p className="font-semibold text-gray-900 text-sm">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {options.map((o) => {
          const selected = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(o.value)}
              className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all ${
                selected
                  ? "bg-emerald-50 border-emerald-400 text-emerald-700 ring-1 ring-emerald-300"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
              } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WeeklySignalsContent() {
  const searchParams = useSearchParams();
  const preselectedProjectId = searchParams.get("project");

  const [mentorId, setMentorId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    preselectedProjectId ?? null
  );
  const [project, setProject] = useState<Project | null>(null);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [activeCandidateIdx, setActiveCandidateIdx] = useState(0);
  const [forms, setForms] = useState<Record<string, SignalForm>>({});
  const [savedSet, setSavedSet] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load mentor + projects
  useEffect(() => {
    const boot = async () => {
      const supabase = createClient();
      const user = await getCurrentUser();
      if (!user || user.role !== "mentor") return;
      setMentorId(user.id);

      const { data: assignments } = await supabase
        .from("mentor_assignment")
        .select(
          "project_id, project:project(id, title, company_name, project_duration_weeks, project_start_date, status)"
        )
        .eq("mentor_id", user.id);

      const projList: Project[] = (assignments ?? [])
        .map((a: any) => a.project)
        .filter(Boolean)
        .filter((p: any) => p.status === "in_progress");

      setProjects(projList);
      if (!selectedProjectId && projList.length > 0) {
        setSelectedProjectId(projList[0].id);
      }
      setLoading(false);
    };
    boot();
  }, [selectedProjectId]);

  // Load candidates + existing signals when project changes
  useEffect(() => {
    if (!selectedProjectId || !mentorId) return;

    const loadProject = async () => {
      const supabase = createClient();
      setLoading(true);

      const proj = projects.find((p) => p.id === selectedProjectId);
      if (!proj) return;
      setProject(proj);

      const today = new Date();
      const startDate = proj.project_start_date ? new Date(proj.project_start_date) : null;
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

      // Candidates
      const { data: agreements } = await supabase
        .from("signed_agreement")
        .select(
          "candidate_id, candidate:user!signed_agreement_candidate_id_fkey(id, name, email)"
        )
        .eq("project_id", selectedProjectId);

      const cands: Candidate[] = (agreements ?? []).map((a: any) => ({
        id: a.candidate?.id,
        name: a.candidate?.name,
        email: a.candidate?.email,
      }));
      setCandidates(cands);
      setActiveCandidateIdx(0);

      // Existing signals for this week
      const { data: signals } = await supabase
        .from("mentor_weekly_signal")
        .select("*")
        .eq("project_id", selectedProjectId)
        .eq("week_no", week)
        .eq("mentor_id", mentorId);

      // Existing exceptions
      const { data: exceptions } = await supabase
        .from("exception_event")
        .select("*")
        .eq("project_id", selectedProjectId)
        .eq("week_no", week)
        .eq("mentor_id", mentorId);

      const newForms: Record<string, SignalForm> = {};
      const newSaved = new Set<string>();

      for (const c of cands) {
        const sig = signals?.find((s: any) => s.candidate_id === c.id);
        const candExceptions = (exceptions ?? []).filter(
          (e: any) => e.candidate_id === c.id
        );

        if (sig) {
          newSaved.add(c.id);
          newForms[c.id] = {
            prepared: sig.prepared,
            clarity: sig.clarity,
            follow_through: sig.follow_through,
            prompting: sig.prompting,
            no_show: sig.no_show,
            observation: sig.observation ?? "",
            exceptions: candExceptions.map((e: any) => ({
              id: e.id,
              event_type: e.event_type,
              notes: e.notes ?? "",
            })),
          };
        } else {
          newForms[c.id] = initForm();
        }
      }

      setForms(newForms);
      setSavedSet(newSaved);
      setLoading(false);
    };

    loadProject();
  }, [selectedProjectId, mentorId, projects]);

  const activeCandidate = candidates[activeCandidateIdx];
  const activeForm = activeCandidate ? forms[activeCandidate.id] ?? initForm() : initForm();

  const updateForm = useCallback(
    (field: keyof SignalForm, value: unknown) => {
      if (!activeCandidate) return;
      setForms((prev) => ({
        ...prev,
        [activeCandidate.id]: {
          ...(prev[activeCandidate.id] ?? initForm()),
          [field]: value,
        },
      }));
    },
    [activeCandidate]
  );

  const copyLastWeek = async () => {
    if (!activeCandidate || !selectedProjectId || !mentorId || currentWeek < 2) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("mentor_weekly_signal")
      .select("*")
      .eq("project_id", selectedProjectId)
      .eq("candidate_id", activeCandidate.id)
      .eq("week_no", currentWeek - 1)
      .eq("mentor_id", mentorId)
      .single();
    if (data) {
      setForms((prev) => ({
        ...prev,
        [activeCandidate.id]: {
          prepared: data.prepared,
          clarity: data.clarity,
          follow_through: data.follow_through,
          prompting: data.prompting,
          no_show: data.no_show,
          observation: data.observation ?? "",
          exceptions: prev[activeCandidate.id]?.exceptions ?? [],
        },
      }));
    }
  };

  const saveSignal = async () => {
    if (!activeCandidate || !selectedProjectId || !mentorId) return;
    const supabase = createClient();
    const form = forms[activeCandidate.id];
    if (!form) return;

    // Validate required fields (unless no_show)
    if (!form.no_show) {
      if (!form.prepared || !form.clarity || !form.follow_through || form.prompting === null) {
        alert("Please fill in all signal fields before saving.");
        return;
      }
    }

    setSaving(true);

    // Upsert signal
    const { error } = await supabase.from("mentor_weekly_signal").upsert(
      {
        project_id: selectedProjectId,
        candidate_id: activeCandidate.id,
        mentor_id: mentorId,
        week_no: currentWeek,
        prepared: form.no_show ? "no" : form.prepared!,
        clarity: form.no_show ? "no" : form.clarity!,
        follow_through: form.no_show ? "no" : form.follow_through!,
        prompting: form.no_show ? false : form.prompting!,
        no_show: form.no_show,
        observation: form.observation || null,
      },
      { onConflict: "project_id,candidate_id,week_no" }
    );

    if (!error) {
      // Save exceptions
      for (const exc of form.exceptions) {
        if (exc.id) continue; // already saved
        await supabase.from("exception_event").insert({
          project_id: selectedProjectId,
          candidate_id: activeCandidate.id,
          mentor_id: mentorId,
          week_no: currentWeek,
          event_type: exc.event_type,
          notes: exc.notes || null,
        });
      }

      setSavedSet((prev) => new Set([...prev, activeCandidate.id]));

      // Auto-advance to next unsaved
      const nextUnsaved = candidates.findIndex(
        (c, i) =>
          i > activeCandidateIdx && !savedSet.has(c.id) && c.id !== activeCandidate.id
      );
      if (nextUnsaved !== -1) setActiveCandidateIdx(nextUnsaved);
    }

    setSaving(false);
  };

  const addException = () => {
    updateForm("exceptions", [
      ...activeForm.exceptions,
      { event_type: EXCEPTION_TYPES[0].value, notes: "" },
    ]);
  };

  const removeException = (idx: number) => {
    updateForm(
      "exceptions",
      activeForm.exceptions.filter((_, i) => i !== idx)
    );
  };

  const updateException = (idx: number, field: "event_type" | "notes", value: string) => {
    const updated = [...activeForm.exceptions];
    updated[idx] = { ...updated[idx], [field]: value };
    updateForm("exceptions", updated);
  };

  const noShowToggle = () => updateForm("no_show", !activeForm.no_show);

  if (loading && projects.length === 0) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4 max-w-2xl mx-auto">
          <div className="h-8 bg-gray-100 rounded w-1/3" />
          <div className="h-64 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
          <Radio className="w-4.5 h-4.5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Weekly Signal Capture</h1>
          {project && (
            <p className="text-sm text-gray-500">
              {project.title} — {project.company_name}
            </p>
          )}
        </div>

        {/* Week nav */}
        {project && (
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setCurrentWeek((w) => Math.max(1, w - 1))}
              className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-gray-500" />
            </button>
            <span className="text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-1">
              Week {currentWeek} of {project.project_duration_weeks}
            </span>
            <button
              onClick={() =>
                setCurrentWeek((w) => Math.min(project.project_duration_weeks, w + 1))
              }
              className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50"
            >
              <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
            </button>
            <span className="ml-2 text-sm text-gray-500">
              {savedSet.size}/{candidates.length} candidates
            </span>
          </div>
        )}
      </div>

      {/* Project selector if multiple */}
      {projects.length > 1 && (
        <div className="flex gap-2 mb-5 flex-wrap">
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedProjectId(p.id)}
              className={`text-sm px-3 py-1.5 rounded-lg font-medium border transition-colors ${
                selectedProjectId === p.id
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {p.title}
            </button>
          ))}
        </div>
      )}

      {/* Candidate tabs */}
      {candidates.length > 0 && (
        <div className="flex gap-2 mb-5 flex-wrap">
          {candidates.map((c, i) => {
            const initials = c.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();
            const isSaved = savedSet.has(c.id);
            const isActive = i === activeCandidateIdx;
            return (
              <button
                key={c.id}
                onClick={() => setActiveCandidateIdx(i)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  isActive
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : isSaved
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                    isActive ? "bg-white text-indigo-600" : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {initials}
                </span>
                {c.name.split(" ")[0]}
              </button>
            );
          })}
        </div>
      )}

      {/* Signal form */}
      {activeCandidate ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          {/* Candidate header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-600 text-white text-sm font-bold flex items-center justify-center">
                {activeCandidate.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-gray-900">{activeCandidate.name}</p>
                <p className="text-xs text-gray-400">{activeCandidate.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {currentWeek > 1 && (
                <button
                  onClick={copyLastWeek}
                  className="flex items-center gap-1.5 text-sm text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy last week
                </button>
              )}
              <button
                onClick={noShowToggle}
                className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                  activeForm.no_show
                    ? "bg-red-50 text-red-600 border-red-200"
                    : "text-gray-500 border-gray-200 hover:bg-gray-50"
                }`}
              >
                <EyeOff className="w-3.5 h-3.5" />
                No show
              </button>
            </div>
          </div>

          {activeForm.no_show ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 mb-6">
              This candidate did not attend the session. The signal will be marked as no-show.
            </div>
          ) : (
            <div className="space-y-6">
              <RadioGroup
                label="Prepared for meeting"
                description="Came ready with progress, questions, or materials"
                options={[
                  { value: "yes", label: "Yes" },
                  { value: "partial", label: "Partial" },
                  { value: "no", label: "No" },
                ]}
                value={activeForm.prepared}
                onChange={(v) => updateForm("prepared", v)}
              />

              <RadioGroup
                label="Can explain work clearly"
                description="Articulates what was done and why"
                options={[
                  { value: "yes", label: "Yes" },
                  { value: "some_gaps", label: "Some gaps" },
                  { value: "no", label: "No" },
                ]}
                value={activeForm.clarity}
                onChange={(v) => updateForm("clarity", v)}
              />

              <RadioGroup
                label="Followed through since last week"
                description="Completed tasks discussed in previous session"
                options={[
                  { value: "yes", label: "Yes" },
                  { value: "partially", label: "Partially" },
                  { value: "no", label: "No" },
                ]}
                value={activeForm.follow_through}
                onChange={(v) => updateForm("follow_through", v)}
              />

              <RadioGroup
                label="Needed prompting to move forward"
                description="Required mentor guidance to continue or make progress"
                options={[
                  { value: "yes" as any, label: "Yes" },
                  { value: "no" as any, label: "No" },
                ]}
                value={activeForm.prompting === null ? null : activeForm.prompting ? "yes" : "no"}
                onChange={(v) => updateForm("prompting", v === "yes")}
              />
            </div>
          )}

          {/* Observation */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-semibold text-gray-900">Key observation</label>
              <span className="text-xs text-gray-400">
                {activeForm.observation.length}/140
              </span>
            </div>
            <textarea
              maxLength={140}
              rows={3}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 placeholder-gray-300"
              placeholder="Brief observation about this candidate..."
              value={activeForm.observation}
              onChange={(e) => updateForm("observation", e.target.value)}
            />
          </div>

          {/* Exception Events */}
          <div className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-900">Exception Events</p>
              <button
                onClick={addException}
                className="flex items-center gap-1 text-sm text-indigo-600 font-medium hover:text-indigo-700"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Event
              </button>
            </div>

            {activeForm.exceptions.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No exceptions this week.</p>
            ) : (
              <div className="space-y-2">
                {activeForm.exceptions.map((exc, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <select
                      className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      value={exc.event_type}
                      onChange={(e) => updateException(i, "event_type", e.target.value)}
                    >
                      {EXCEPTION_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      maxLength={140}
                      className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      placeholder="Notes (optional)"
                      value={exc.notes}
                      onChange={(e) => updateException(i, "notes", e.target.value)}
                    />
                    <button
                      onClick={() => removeException(i)}
                      className="text-gray-300 hover:text-red-400 transition-colors mt-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Save */}
          <button
            onClick={saveSignal}
            disabled={saving}
            className="mt-6 w-full flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60"
          >
            {saving ? (
              "Saving..."
            ) : savedSet.has(activeCandidate.id) ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Update Signal
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Signal
              </>
            )}
          </button>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={() => setActiveCandidateIdx((i) => Math.max(0, i - 1))}
              disabled={activeCandidateIdx === 0}
              className="flex items-center gap-1 text-sm text-gray-500 disabled:opacity-30 hover:text-gray-700"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <span className="text-sm text-gray-400">
              {activeCandidateIdx + 1} / {candidates.length}
            </span>
            <button
              onClick={() =>
                setActiveCandidateIdx((i) => Math.min(candidates.length - 1, i + 1))
              }
              disabled={activeCandidateIdx === candidates.length - 1}
              className="flex items-center gap-1 text-sm text-gray-500 disabled:opacity-30 hover:text-gray-700"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400 text-sm">
          {projects.length === 0
            ? "No active projects assigned to you."
            : "No confirmed candidates for this project yet."}
        </div>
      )}
    </div>
  );
}

export default function WeeklySignalsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8">
          <div className="animate-pulse space-y-4 max-w-2xl mx-auto">
            <div className="h-8 bg-gray-100 rounded w-1/3" />
            <div className="h-64 bg-gray-100 rounded-2xl" />
          </div>
        </div>
      }
    >
      <WeeklySignalsContent />
    </Suspense>
  );
}
