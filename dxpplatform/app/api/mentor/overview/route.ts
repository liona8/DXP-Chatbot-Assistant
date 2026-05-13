import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type MaybeArray<T> = T | T[] | null;

type SessionCookie = {
  id?: string;
  role?: string;
};

type AssignmentRow = {
  project_id: string;
  project: MaybeArray<{
    id: string;
    title: string;
    company_name: string;
    company_industry: string | null;
    problem_statement: string | null;
    project_duration_weeks: number;
    project_start_date: string | null;
    status: string;
    max_candidates: number;
  }>;
};

type AgreementRow = {
  project_id: string;
  candidate_id: string;
  candidate: MaybeArray<{ id: string; name: string | null; email: string | null }>;
};

function firstRow<T>(row: MaybeArray<T>) {
  return Array.isArray(row) ? row[0] ?? null : row;
}

function currentProjectWeek(startDate: string | null, duration: number) {
  if (!startDate) return 1;

  const start = new Date(startDate);
  const today = new Date();
  return Math.min(
    Math.max(Math.ceil((today.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)), 1),
    duration || 1
  );
}

function readSession(value: string | undefined) {
  if (!value) return null;
  try {
    return JSON.parse(value) as SessionCookie;
  } catch {
    return null;
  }
}

export async function GET() {
  const cookieStore = await cookies();
  const session = readSession(cookieStore.get("dxp_user")?.value);

  if (!session?.id || session.role !== "mentor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: assignments, error: assignmentsError } = await supabase
    .from("mentor_assignment")
    .select(
      `project_id,
       project:project(
         id,
         title,
         company_name,
         company_industry,
         problem_statement,
         project_duration_weeks,
         project_start_date,
         status,
         max_candidates
       )`
    )
    .eq("mentor_id", session.id);

  if (assignmentsError) {
    return NextResponse.json({ error: assignmentsError.message }, { status: 500 });
  }

  const projectRows = ((assignments ?? []) as AssignmentRow[])
    .map((assignment) => firstRow(assignment.project))
    .filter((project): project is NonNullable<typeof project> => project != null);

  const projectIds = projectRows.map((project) => project.id);

  const { data: agreements, error: agreementsError } =
    projectIds.length > 0
      ? await supabase
          .from("signed_agreement")
          .select(
            `project_id,
             candidate_id,
             candidate:user!signed_agreement_candidate_id_fkey(id, name, email)`
          )
          .in("project_id", projectIds)
      : { data: [], error: null };

  if (agreementsError) {
    return NextResponse.json({ error: agreementsError.message }, { status: 500 });
  }

  const agreementRows = (agreements ?? []) as AgreementRow[];
  const candidateIds = [...new Set(agreementRows.map((row) => row.candidate_id))];
  const { data: profiles, error: profilesError } =
    candidateIds.length > 0
      ? await supabase
          .from("candidate_profile")
          .select("id, institution, field_of_study")
          .in("id", candidateIds)
      : { data: [], error: null };

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const projects = [];
  const candidates = [];
  let totalCandidates = 0;
  let signalsPending = 0;
  let signalsCaptured = 0;

  for (const project of projectRows) {
    const currentWeek = currentProjectWeek(
      project.project_start_date,
      project.project_duration_weeks
    );
    const projectAgreements = agreementRows.filter((row) => row.project_id === project.id);

    const { data: signals, error: signalsError } = await supabase
      .from("mentor_weekly_signal")
      .select("id, candidate_id")
      .eq("project_id", project.id)
      .eq("mentor_id", session.id)
      .eq("week_no", currentWeek);

    if (signalsError) {
      return NextResponse.json({ error: signalsError.message }, { status: 500 });
    }

    const signalsDone = signals?.length ?? 0;
    const candidateCount = projectAgreements.length;
    totalCandidates += candidateCount;
    signalsCaptured += signalsDone;
    signalsPending += Math.max(candidateCount - signalsDone, 0);

    projects.push({
      ...project,
      currentWeek,
      candidateCount,
      signalsDone,
      signalsTotal: candidateCount,
      progressPct:
        project.project_duration_weeks > 0
          ? Math.round((currentWeek / project.project_duration_weeks) * 100)
          : 0,
    });

    for (const agreement of projectAgreements) {
      const candidate = firstRow(agreement.candidate);
      const profile = profilesById.get(agreement.candidate_id);
      const { count } = await supabase
        .from("mentor_weekly_signal")
        .select("id", { count: "exact", head: true })
        .eq("project_id", agreement.project_id)
        .eq("candidate_id", agreement.candidate_id)
        .eq("mentor_id", session.id);

      candidates.push({
        id: candidate?.id ?? agreement.candidate_id,
        name: candidate?.name ?? "Unknown",
        email: candidate?.email ?? "",
        institution: profile?.institution ?? null,
        field_of_study: profile?.field_of_study ?? null,
        projectTitle: project.title,
        projectId: project.id,
        signalCount: count ?? 0,
      });
    }
  }

  return NextResponse.json({
    projects,
    candidates,
    stats: {
      activeProjects: projects.filter((project) => project.status === "in_progress").length,
      totalCandidates,
      signalsPending,
      signalsCaptured,
    },
  });
}
