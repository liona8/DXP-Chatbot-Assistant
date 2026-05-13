"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  ArrowRight,
  Calendar,
  CheckCircle,
  ClipboardList,
  FolderOpen,
  Search,
  Users,
} from "lucide-react";

type Project = {
  id: string;
  title: string;
  company_name: string;
  company_industry: string | null;
  problem_statement: string | null;
  project_duration_weeks: number;
  project_start_date: string | null;
  status: string;
  candidateCount: number;
  currentWeek: number;
  signalsDone: number;
};

function statusLabel(status: string) {
  return status
    .split("_")
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

export default function MentorProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      const user = await getCurrentUser();
      if (!user || user.role !== "mentor") {
        router.push("/login");
        return;
      }

      const response = await fetch("/api/mentor/overview", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load mentor projects");

      const data = (await response.json()) as { projects: Project[] };
      setProjects(data.projects ?? []);
      setLoading(false);
    };

    load();
  }, [router]);

  const filtered = projects.filter((project) => {
    const query = search.toLowerCase();
    return (
      project.title.toLowerCase().includes(query) ||
      project.company_name.toLowerCase().includes(query) ||
      (project.company_industry ?? "").toLowerCase().includes(query)
    );
  });

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Projects</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading
              ? "Loading..."
              : `${projects.length} assigned project${projects.length !== 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search projects..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-1/2 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-full mb-2" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <FolderOpen className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">
            {search ? "No projects match your search." : "No projects assigned yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((project) => {
            const signalsPending = Math.max(project.candidateCount - project.signalsDone, 0);
            const hasAllSignals =
              project.candidateCount > 0 && project.signalsDone >= project.candidateCount;

            return (
              <Link
                key={project.id}
                href={`/mentor/projects/${project.id}`}
                className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all group"
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-700 font-bold text-base flex items-center justify-center shrink-0">
                    {project.title[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase truncate">
                      {project.company_industry ?? project.company_name}
                    </p>
                    <h2 className="text-base font-bold text-gray-900 mt-0.5 group-hover:text-indigo-700 transition-colors">
                      {project.title}
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">{project.company_name}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-colors" />
                </div>

                {project.problem_statement && (
                  <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-4">
                    {project.problem_statement.replace(/\n+/g, " ")}
                  </p>
                )}

                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="flex items-center gap-1.5 bg-gray-100 text-gray-500 rounded-full px-3 py-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Week {project.currentWeek}/{project.project_duration_weeks}
                  </span>
                  <span className="flex items-center gap-1.5 bg-gray-100 text-gray-500 rounded-full px-3 py-1">
                    <Users className="w-3.5 h-3.5" />
                    {project.candidateCount} candidates
                  </span>
                  <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-3 py-1 font-medium">
                    {statusLabel(project.status)}
                  </span>
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  {hasAllSignals ? (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                      <CheckCircle className="w-3.5 h-3.5" />
                      All signals captured
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-600">
                      <ClipboardList className="w-3.5 h-3.5" />
                      {signalsPending} signal{signalsPending !== 1 ? "s" : ""} pending
                    </span>
                  )}
                  <span className="text-xs font-semibold text-indigo-600">View project</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
