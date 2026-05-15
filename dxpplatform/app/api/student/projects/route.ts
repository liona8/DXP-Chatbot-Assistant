import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";

type SessionCookie = {
  id?: string;
  email?: string;
  role?: string;
};

type ProjectRow = {
  id: string;
  title: string;
  company_name: string;
  company_industry: string;
  problem_statement: string;
  project_duration_weeks: number;
  max_candidates: number;
  status: "open" | "closed" | "draft" | "in_progress";
  submission_end_date: string | null;
  project_start_date: string | null;
  compensation_amount: number;
};

type SignedAgreementRow = {
  project_id: string;
  signed_at: string | null;
  agreement_pdf_url: string | null;
};

type HealthLogRow = {
  project_id: string;
  week_number: number;
  health_score: number | null;
};

function readSession(value: string | undefined) {
  if (!value) return null;
  try {
    return JSON.parse(value) as SessionCookie;
  } catch {
    return null;
  }
}

const PROJECT_SELECT = `
  id, title, company_name, company_industry, problem_statement,
  project_duration_weeks, max_candidates, status,
  submission_end_date, project_start_date, compensation_amount
`;

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = readSession(cookieStore.get("dxp_user")?.value);

    if (!session?.id || session.role !== "candidate") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
    const supabase = hasServiceRole ? createAdminClient() : await createServerClient();

  const { data: candidate, error: candidateError } = await supabase
    .from("user")
    .select("id, name, email")
    .eq("id", session.id)
    .maybeSingle();

  if (candidateError) {
    return NextResponse.json({ error: candidateError.message }, { status: 500 });
  }

  const [
    { data: confirmedProposals, error: confirmedError },
    { data: signedAgreements, error: signedError },
    { data: allProposals, error: allProposalsError },
  ] = await Promise.all([
    supabase
      .from("proposal")
      .select("project_id, status")
      .eq("candidate_id", session.id)
      .eq("status", "confirmed"),
    supabase
      .from("signed_agreement")
      .select("project_id, signed_at, agreement_pdf_url")
      .eq("candidate_id", session.id)
      .order("signed_at", { ascending: false }),
    supabase
      .from("proposal")
      .select("project_id, status")
      .eq("candidate_id", session.id),
  ]);

  const baseError = confirmedError ?? signedError ?? allProposalsError;
  if (baseError) {
    return NextResponse.json({ error: baseError.message }, { status: 500 });
  }

  const confirmedProjectIds = new Set((confirmedProposals ?? []).map((row) => row.project_id));
  const signedByProject = new Map(
    ((signedAgreements ?? []) as SignedAgreementRow[]).map((agreement) => [
      agreement.project_id,
      agreement,
    ])
  );
  const activeProjectIds = [...confirmedProjectIds].filter((id) => signedByProject.has(id));

  const { data: projects, error: projectsError } =
    activeProjectIds.length > 0
      ? await supabase.from("project").select(PROJECT_SELECT).in("id", activeProjectIds)
      : { data: [], error: null };

  if (projectsError) {
    return NextResponse.json({ error: projectsError.message }, { status: 500 });
  }

  const { data: healthLogs, error: healthError } =
    activeProjectIds.length > 0
      ? await supabase
          .from("project_health_log")
          .select("project_id, week_number, health_score")
          .in("project_id", activeProjectIds)
          .order("week_number", { ascending: false })
      : { data: [], error: null };

  if (healthError) {
    return NextResponse.json({ error: healthError.message }, { status: 500 });
  }

  const latestHealthByProject = new Map<string, HealthLogRow>();
  for (const log of (healthLogs ?? []) as HealthLogRow[]) {
    if (!latestHealthByProject.has(log.project_id)) {
      latestHealthByProject.set(log.project_id, log);
    }
  }

  const activeProjects = ((projects ?? []) as ProjectRow[]).map((project) => ({
    ...project,
    signed_at: signedByProject.get(project.id)?.signed_at ?? null,
    agreement_pdf_url: signedByProject.get(project.id)?.agreement_pdf_url ?? null,
    week_number: latestHealthByProject.get(project.id)?.week_number,
    health_score: latestHealthByProject.get(project.id)?.health_score,
  }));

  const pendingStatuses = ["submitted", "reviewed", "shortlisted", "interviewed", "selected"];
  const pending = (allProposals ?? []).filter((proposal) =>
    pendingStatuses.includes(proposal.status)
  ).length;

    return NextResponse.json({
      candidate: {
        id: session.id,
        email: candidate?.email ?? session.email ?? null,
        name: candidate?.name ?? null,
      },
      activeProjects,
      proposalCounts: {
        pending,
        confirmed: activeProjects.length,
      },
      debug: {
        usingAdminClient: hasServiceRole,
        confirmedProjectIds: [...confirmedProjectIds],
        signedProjectIds: [...signedByProject.keys()],
        activeProjectIds,
        allProposals: allProposals ?? [],
        signedAgreements: signedAgreements ?? [],
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load assigned projects.",
      },
      { status: 500 }
    );
  }
}
