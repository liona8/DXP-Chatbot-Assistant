import type { MentorContext } from './getMentorContext'

export function buildMentorSystemPrompt(ctx: MentorContext): string {
  const p = ctx.project
  const h = ctx.healthLog

  const logs = ctx.weeklyLogs.length > 0
    ? ctx.weeklyLogs.map(l =>
        `  Week ${l.week_number}:\n` +
        `    Completed: ${l.tasks_completed}\n` +
        `    Planned:   ${l.tasks_planned}\n` +
        (l.blockers ? `    Blockers:  ${l.blockers}` : `    Blockers:  None reported`)
      ).join('\n\n')
    : '  No weekly logs submitted yet.'

  const signals = ctx.signals.length > 0
    ? ctx.signals.map(s =>
        `  Week ${s.week_no}: Prepared=${s.prepared}, Clarity=${s.clarity}, Follow-through=${s.follow_through}` +
        (s.no_show    ? ' [NO SHOW]'          : '') +
        (s.prompting  ? ' [needed prompting]' : '') +
        (s.observation ? ` — "${s.observation}"` : '')
      ).join('\n')
    : '  No signals logged yet.'

  const unresolvedEscalations = ctx.exceptions.filter(e => !e.resolved_at)
  const exceptions = unresolvedEscalations.length > 0
    ? unresolvedEscalations.map(e =>
        `  Week ${e.week_no}: [${e.source}] ${e.event_type}` +
        (e.notes ? ` — ${e.notes}` : '') +
        (e.chat_excerpt ? `\n    Student said: "${e.chat_excerpt.substring(0, 120)}"` : '')
      ).join('\n')
    : '  None.'

  const healthSummary = h
    ? `Status: ${h.status} (score: ${h.health_score}/100)\n  Summary: ${h.summary}\n  Red flags: ${h.red_flags?.join(', ') ?? 'None'}\n  Recommendations: ${h.recommendations?.join(', ') ?? 'None'}`
    : '  No health log available yet.'

  const c = ctx.candidate?.candidate as any
  const cp = c?.candidate_profile
  const candidateInfo = c
    ? `Name: ${c.name}\n  Study: ${cp?.course_name ?? 'N/A'} at ${cp?.institution ?? 'N/A'}\n  Skills: ${cp?.skills?.join(', ') ?? 'N/A'}`
    : '  Candidate info not available.'

  return `
You are a mentor assistant for the Kabel DXP program.
You are supporting a mentor who is guiding a student through a real client project.

=== PROJECT ===
Title:   ${p?.title ?? 'Unknown'}
Company: ${p?.company_name ?? 'Unknown'}
Scope:   ${p?.project_scope ?? 'Not specified'}
Problem: ${p?.problem_statement ?? 'Not specified'}
Health:  ${p?.current_health ?? 'unknown'}

=== STUDENT ===
${candidateInfo}

=== WEEKLY LOGS (submitted by student) ===
${logs}

=== MENTOR SIGNALS (your own check-in notes) ===
${signals}

=== UNRESOLVED ESCALATIONS ===
${exceptions}

=== LATEST HEALTH ANALYSIS ===
${healthSummary}

=== YOUR ROLE ===
What you DO:
- Suggest specific coaching questions the mentor can bring to their next check-in
- Identify behavioural patterns across weeks (recurring blockers, inconsistent follow-through)
- Provide phase-based validation prompts — what to check and what to challenge
- Offer framework guidance for handling student challenges
- Highlight unresolved chatbot escalations and suggest how to address them in the check-in
- Summarise student progress clearly when asked

What you DO NOT do:
- Make decisions for the mentor
- Give the student direct answers
- Repeat data without adding insight

Keep responses concise, specific, and immediately actionable.
`.trim()
}