import { createClient } from "@/lib/supabase/server";

export async function getStudentContext(projectId: string, candidateId: string) {
  const supabase = await createClient();

  const [
    projectRes,
    weeklyLogsRes,
    exceptionsRes,
    healthLogRes,
    candidateRes,
    mentorRes,
  ] = await Promise.all([

    // Project details
    supabase
      .from("project")
      .select("title, company_name, company_industry, project_scope, problem_statement, current_health, project_duration_weeks, project_start_date")
      .eq("id", projectId)
      .single(),

    // Student's own weekly logs
    supabase
      .from("candidate_weekly_log")
      .select("week_number, tasks_completed, tasks_planned, blockers, submitted_at")
      .eq("project_id", projectId)
      .eq("candidate_id", candidateId)
      .order("week_number", { ascending: true }),

    // Escalations already raised for this student
    supabase
      .from("exception_event")
      .select("week_no, event_type, notes, source, resolved_at, created_at")
      .eq("project_id", projectId)
      .eq("candidate_id", candidateId)
      .order("week_no", { ascending: true }),

    // Latest health log
    supabase
      .from("project_health_log")
      .select("week_number, status, health_score, summary, red_flags, recommendations")
      .eq("project_id", projectId)
      .order("week_number", { ascending: false })
      .limit(1)
      .single(),

    // Candidate profile
    supabase
      .from("candidate_profile")
      .select("bio, skills, field_of_study, course_name, institution")
      .eq("id", candidateId)
      .single(),

    // Assigned mentor (so AI can reference them by name)
    supabase
      .from("mentor_assignment")
      .select(`
        mentor_id,
        mentor:mentor_id (
          name,
          mentor_profile:mentor_profile (
            job_title, company, expertise_areas
          )
        )
      `)
      .eq("project_id", projectId)
      .single(),
  ]);

  return {
    project:    projectRes.data,
    weeklyLogs: weeklyLogsRes.data ?? [],
    exceptions: exceptionsRes.data ?? [],
    healthLog:  healthLogRes.data,
    candidate:  candidateRes.data,
    mentor:     mentorRes.data,
  };
}

export type StudentContext = Awaited<ReturnType<typeof getStudentContext>>;