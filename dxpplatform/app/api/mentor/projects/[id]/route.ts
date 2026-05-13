import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type MaybeArray<T> = T | T[] | null;

type SessionCookie = {
  id?: string;
  role?: string;
};

type AgreementRow = {
  candidate_id: string;
  candidate: MaybeArray<{ id: string; name: string | null; email: string | null }>;
};

type ProposalRow = {
  candidate_id: string | null;
  group_id: string | null;
  proposal_pdf_url: string | null;
};

function firstRow<T>(row: MaybeArray<T>) {
  return Array.isArray(row) ? row[0] ?? null : row;
}

function readSession(value: string | undefined) {
  if (!value) return null;
  try {
    return JSON.parse(value) as SessionCookie;
  } catch {
    return null;
  }
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

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await context.params;
  const cookieStore = await cookies();
  const session = readSession(cookieStore.get("dxp_user")?.value);

  if (!session?.id || session.role !== "mentor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: assignment, error: assignmentError } = await supabase
    .from("mentor_assignment")
    .select("id")
    .eq("project_id", projectId)
    .eq("mentor_id", session.id)
    .maybeSingle();

  if (assignmentError) {
    return NextResponse.json({ error: assignmentError.message }, { status: 500 });
  }

  if (!assignment) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: project, error: projectError } = await supabase
    .from("project")
    .select(
      "id, title, company_name, company_website, problem_statement, project_scope, requirements, project_start_date, project_duration_weeks, status, max_candidates"
    )
    .eq("id", projectId)
    .maybeSingle();

  if (projectError) {
    return NextResponse.json({ error: projectError.message }, { status: 500 });
  }

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const currentWeek = currentProjectWeek(project.project_start_date, project.project_duration_weeks);

  const [
    { data: healthLogs, error: healthError },
    { data: agreements, error: agreementsError },
    { data: proposals, error: proposalsError },
    { data: signals, error: signalsError },
    { data: exceptions, error: exceptionsError },
    { data: allSignals, error: allSignalsError },
  ] = await Promise.all([
    supabase
      .from("project_health_log")
      .select("week_number, health_score, status, red_flags, recommendations, summary, executive_summary")
      .eq("project_id", projectId)
      .order("week_number", { ascending: true }),
    supabase
      .from("signed_agreement")
      .select(
        `candidate_id,
         candidate:user!signed_agreement_candidate_id_fkey(id, name, email)`
      )
      .eq("project_id", projectId),
    supabase
      .from("proposal")
      .select("id, candidate_id, group_id, proposal_pdf_url, status")
      .eq("project_id", projectId)
      .in("status", ["confirmed", "selected"]),
    supabase
      .from("mentor_weekly_signal")
      .select("*")
      .eq("project_id", projectId)
      .eq("week_no", currentWeek)
      .eq("mentor_id", session.id),
    supabase
      .from("exception_event")
      .select("*")
      .eq("project_id", projectId)
      .eq("week_no", currentWeek)
      .eq("mentor_id", session.id),
    supabase
      .from("mentor_weekly_signal")
      .select("candidate_id, week_no")
      .eq("project_id", projectId)
      .eq("mentor_id", session.id),
  ]);

  const error =
    healthError ??
    agreementsError ??
    proposalsError ??
    signalsError ??
    exceptionsError ??
    allSignalsError;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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
  const proposalRows = (proposals ?? []) as ProposalRow[];
  const candidates = agreementRows.map((agreement) => {
    const candidate = firstRow(agreement.candidate);
    const profile = profilesById.get(agreement.candidate_id);
    const proposal = proposalRows.find(
      (row) => row.candidate_id === agreement.candidate_id
    );

    return {
      id: candidate?.id ?? agreement.candidate_id,
      name: candidate?.name ?? "Unknown",
      email: candidate?.email ?? "",
      institution: profile?.institution ?? null,
      field_of_study: profile?.field_of_study ?? null,
      proposal_url: proposal?.proposal_pdf_url ?? null,
      is_group: false,
      group_name: null,
    };
  });

  return NextResponse.json({
    project,
    currentWeek,
    health: healthLogs?.slice(-1)[0] ?? null,
    allHealth: healthLogs ?? [],
    candidates,
    signals: signals ?? [],
    exceptions: exceptions ?? [],
    allSignals: allSignals ?? [],
  });
}
