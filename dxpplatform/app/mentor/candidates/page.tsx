"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUser } from "@/lib/auth/current-user";
import { Users, Search, Building2 } from "lucide-react";

type Candidate = {
  id: string;
  name: string;
  email: string;
  institution: string | null;
  field_of_study: string | null;
  projectTitle: string;
  projectId: string;
  signalCount: number;
};

type MaybeArray<T> = T | T[] | null;

type AssignmentRow = {
  project_id: string;
  project: MaybeArray<{
    id: string;
    title: string;
    project_start_date: string | null;
    project_duration_weeks: number;
  }>;
};

type AgreementRow = {
  project_id: string;
  candidate_id: string;
  candidate: { id: string; name: string | null; email: string | null } | null;
  candidate_profile: { institution: string | null; field_of_study: string | null } | null;
};

function firstRow<T>(row: MaybeArray<T>) {
  return Array.isArray(row) ? row[0] ?? null : row;
}

export default function MentorCandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const user = await getCurrentUser();
      if (!user || user.role !== "mentor") return;

      const { data: assignments } = await supabase
        .from("mentor_assignment")
        .select(
          "project_id, project:project(id, title, project_start_date, project_duration_weeks)"
        )
        .eq("mentor_id", user.id);

      if (!assignments) {
        setLoading(false);
        return;
      }

      const projectIds = assignments.map((a) => a.project_id);
      if (projectIds.length === 0) {
        setCandidates([]);
        setLoading(false);
        return;
      }

      const { data: agreements } = await supabase
        .from("signed_agreement")
        .select(
          `project_id, candidate_id,
           candidate:user!signed_agreement_candidate_id_fkey(id, name, email),
           candidate_profile:candidate_profile(institution, field_of_study)`
        )
        .in("project_id", projectIds);

      const list: Candidate[] = [];

      const assignmentRows = (assignments ?? []) as unknown as AssignmentRow[];
      const agreementRows = (agreements ?? []) as unknown as AgreementRow[];

      for (const a of agreementRows) {
        const proj = firstRow(assignmentRows.find((x) => x.project_id === a.project_id)?.project ?? null);
        if (!proj) continue;

        // Count signals for this candidate
        const { count } = await supabase
          .from("mentor_weekly_signal")
          .select("id", { count: "exact", head: true })
          .eq("project_id", a.project_id)
          .eq("candidate_id", a.candidate_id)
          .eq("mentor_id", user.id);

        list.push({
          id: a.candidate?.id ?? a.candidate_id,
          name: a.candidate?.name ?? "Unknown",
          email: a.candidate?.email ?? "",
          institution: a.candidate_profile?.institution ?? null,
          field_of_study: a.candidate_profile?.field_of_study ?? null,
          projectTitle: proj.title,
          projectId: proj.id,
          signalCount: count ?? 0,
        });
      }

      setCandidates(list);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = candidates.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.projectTitle.toLowerCase().includes(search.toLowerCase()) ||
      (c.institution ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Candidates</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? "Loading..." : `${candidates.length} candidate${candidates.length !== 1 ? "s" : ""} across all projects`}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search by name, email, project, or institution..."
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-100 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">
            {search ? "No candidates match your search." : "No candidates assigned yet."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">
                  Candidate
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">
                  Institution
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">
                  Project
                </th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">
                  Signals
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((c) => {
                const initials = c.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <tr key={`${c.id}-${c.projectId}`} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                          {initials}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                          <p className="text-xs text-gray-400">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {c.institution ? (
                        <div>
                          <p className="text-sm text-gray-700 flex items-center gap-1.5">
                            <Building2 className="w-3 h-3 text-gray-400 shrink-0" />
                            {c.institution}
                          </p>
                          {c.field_of_study && (
                            <p className="text-xs text-gray-400 mt-0.5 ml-4.5">
                              {c.field_of_study}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-300 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-600 bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg text-xs font-medium">
                        {c.projectTitle}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="text-sm font-semibold text-gray-700">
                        {c.signalCount}{" "}
                        <span className="text-gray-400 font-normal text-xs">logged</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
