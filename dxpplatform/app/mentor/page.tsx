"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  FolderOpen,
  Users,
  ClipboardList,
  CheckCircle,
  Calendar,
  ArrowRight,
  Radio,
} from "lucide-react";

type Project = {
  id: string;
  title: string;
  company_name: string;
  project_duration_weeks: number;
  status: string;
  currentWeek: number;
  candidateCount: number;
  signalsDone: number;
  signalsTotal: number;
  progressPct: number;
};

type Stats = {
  activeProjects: number;
  totalCandidates: number;
  signalsPending: number;
  signalsCaptured: number;
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-MY", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function MentorDashboard() {
  const [mentor, setMentor] = useState<{ id: string; name: string } | null>(null);
  const [stats, setStats] = useState<Stats>({
    activeProjects: 0,
    totalCandidates: 0,
    signalsPending: 0,
    signalsCaptured: 0,
  });
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const user = await getCurrentUser();
        if (!user || user.role !== "mentor") return;

        setMentor({ id: user.id, name: user.name });

        const response = await fetch("/api/mentor/overview", { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load mentor overview");

        const data = (await response.json()) as { projects: Project[]; stats: Stats };
        setProjects(data.projects ?? []);
        setStats(data.stats);
      } catch (error) {
        console.error("Failed to load mentor dashboard", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const statCards = [
    {
      icon: FolderOpen,
      value: stats.activeProjects,
      label: "Active Projects",
      sub: "Under your guidance",
      color: "text-indigo-500",
      bg: "bg-indigo-50",
    },
    {
      icon: Users,
      value: stats.totalCandidates,
      label: "Total Candidates",
      sub: "Across all projects",
      color: "text-blue-500",
      bg: "bg-blue-50",
    },
    {
      icon: ClipboardList,
      value: stats.signalsPending,
      label: "Signals Pending",
      sub: "This week",
      color: "text-amber-500",
      bg: "bg-amber-50",
      badge: stats.signalsPending > 0 ? `${stats.signalsPending} remaining` : null,
    },
    {
      icon: CheckCircle,
      value: stats.signalsCaptured,
      label: "Signals Captured",
      sub: "This week",
      color: "text-emerald-500",
      bg: "bg-emerald-50",
    },
  ];

  const firstName = mentor?.name?.split(" ")[0] ?? "";

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Hero banner */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white p-8 mb-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="relative">
          <p className="text-indigo-200 text-sm mb-2 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {formatDate(new Date())}
          </p>
          <h1 className="text-3xl font-bold mb-2">
            {getGreeting()}, {firstName || "Dr."}!
          </h1>
          {stats.signalsPending > 0 ? (
            <p className="text-indigo-100">
              You have{" "}
              <span className="font-semibold text-white">
                {stats.signalsPending} signal{stats.signalsPending > 1 ? "s" : ""}
              </span>{" "}
              to capture this week across your projects.
            </p>
          ) : (
            <p className="text-indigo-100">All signals captured — great work this week!</p>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {statCards.map(({ icon: Icon, value, label, sub, color, bg, badge }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm relative">
            {badge && (
              <span className="absolute top-3 right-3 text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                {badge}
              </span>
            )}
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
              <Icon className={`w-4.5 h-4.5 ${color}`} strokeWidth={2} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{loading ? "—" : value}</p>
            <p className="text-sm font-medium text-gray-700 mt-0.5">{label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Projects list */}
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 text-lg">Your Projects</h2>
            <Link
              href="/mentor/projects"
              className="text-sm text-indigo-600 font-medium flex items-center gap-1 hover:gap-2 transition-all"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {loading ? (
              [1, 2].map((i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
                  <div className="h-4 bg-gray-100 rounded w-1/2 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/3" />
                </div>
              ))
            ) : projects.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400 text-sm">
                No projects assigned yet.
              </div>
            ) : (
              projects.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div>
          <h2 className="font-semibold text-gray-900 text-lg mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              href="/mentor/weekly-signals"
              className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4 hover:border-indigo-200 hover:shadow-sm transition-all group block"
            >
              <div className="relative">
                <div className="w-11 h-11 bg-indigo-600 rounded-xl flex items-center justify-center">
                  <Radio className="w-5 h-5 text-white" />
                </div>
                {stats.signalsPending > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {stats.signalsPending}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 text-sm">Capture Signals</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {stats.signalsPending > 0
                    ? `${stats.signalsPending} signals pending`
                    : "All done this week"}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-colors" />
            </Link>

            <Link
              href="/mentor/projects"
              className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4 hover:border-indigo-200 hover:shadow-sm transition-all group block"
            >
              <div className="w-11 h-11 bg-emerald-600 rounded-xl flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 text-sm">My Projects</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {stats.activeProjects} project{stats.activeProjects !== 1 ? "s" : ""} assigned
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-emerald-500 transition-colors" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const allDone = project.signalsDone >= project.signalsTotal && project.signalsTotal > 0;
  const initials = project.title
    .split(" ")
    .filter((w) => w.length > 2)
    .slice(0, 1)
    .map((w) => w[0].toUpperCase())
    .join("");

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-gray-900 text-sm leading-tight">{project.title}</h3>
            <span className="text-xs text-indigo-600 bg-indigo-50 rounded-full px-2 py-0.5 shrink-0 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Week {project.currentWeek}/{project.project_duration_weeks}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{project.company_name}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-gray-100 rounded-full mb-3">
        <div
          className="h-full bg-indigo-600 rounded-full transition-all"
          style={{ width: `${project.progressPct}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {project.candidateCount} candidates
          </span>
          {allDone ? (
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <CheckCircle className="w-3.5 h-3.5" />
              All signals done
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-600 font-medium">
              <ClipboardList className="w-3.5 h-3.5" />
              {project.signalsTotal - project.signalsDone} signals pending
            </span>
          )}
        </div>
        <Link
          href={`/mentor/weekly-signals?project=${project.id}`}
          className="flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <ClipboardList className="w-3.5 h-3.5" />
          Capture
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
