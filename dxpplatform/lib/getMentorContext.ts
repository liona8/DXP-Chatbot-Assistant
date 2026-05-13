import { createAdminClient } from "@/lib/supabase/admin";

export async function getMentorContext(projectId: string, mentorId: string) {
  const supabase = createAdminClient();

  const [
    projectRes,
    weeklyLogsRes,
    signalsRes,
    exceptionsRes,
    healthLogRes,
    candidateRes,
  ] = await Promise.all([

    // Project details
    supabase
      .from("project")
      .select("title, company_name, project_scope, problem_statement, current_health, project_start_date, project_duration_weeks")
      .eq("id", projectId)
      .single(),

    // All student weekly logs
    supabase
      .from("candidate_weekly_log")
      .select("week_number, tasks_completed, tasks_planned, blockers, submitted_at")
      .eq("project_id", projectId)
      .order("week_number", { ascending: true }),

    // Mentor's own weekly signals
    supabase
      .from("mentor_weekly_signal")
      .select("week_no, prepared, clarity, follow_through, prompting, no_show, observation")
      .eq("project_id", projectId)
      .eq("mentor_id", mentorId)
      .order("week_no", { ascending: true }),

    // Exception / escalation events (includes chatbot-raised ones)
    supabase
      .from("exception_event")
      .select("week_no, event_type, notes, source, chat_excerpt, resolved_at, created_at")
      .eq("project_id", projectId)
      .order("week_no", { ascending: true }),

    // Latest project health log
    supabase
      .from("project_health_log")
      .select("week_number, status, health_score, red_flags, recommendations, summary")
      .eq("project_id", projectId)
      .order("week_number", { ascending: false })
      .limit(1)
      .single(),

    // Candidate info via signed_agreement
    supabase
      .from("signed_agreement")
      .select(`
        candidate_id,
        candidate:candidate_id (
          name,
          candidate_profile:candidate_profile (
            bio, skills, field_of_study, course_name, institution
          )
        )
      `)
      .eq("project_id", projectId)
      .limit(1)
      .single(),
  ]);

  return {
    project:    projectRes.data,
    weeklyLogs: weeklyLogsRes.data  ?? [],
    signals:    signalsRes.data     ?? [],
    exceptions: exceptionsRes.data  ?? [],
    healthLog:  healthLogRes.data,
    candidate:  candidateRes.data,
  };
}

export type MentorContext = Awaited<ReturnType<typeof getMentorContext>>;
