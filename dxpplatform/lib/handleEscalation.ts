import { createClient } from "@/lib/supabase/server";

export type EscalationPayload = {
  should_escalate: boolean;
  trigger: string | null;
  reason: string | null;
};

// Extract the ```escalation ... ``` JSON block from the AI response
export function parseEscalationBlock(aiResponse: string): EscalationPayload | null {
  const match = aiResponse.match(/```escalation\s*([\s\S]*?)```/);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[1].trim());
    if (typeof parsed.should_escalate !== "boolean") return null;
    return parsed as EscalationPayload;
  } catch {
    return null;
  }
}

// Remove the escalation block before sending to the student
export function stripEscalationBlock(aiResponse: string): string {
  return aiResponse.replace(/```escalation[\s\S]*?```/g, "").trim();
}

// Write to exception_event if this is a new escalation
export async function handleEscalation(
  escalation: EscalationPayload,
  projectId: string,
  candidateId: string,
  mentorId: string,
  weekNumber: number,
  chatExcerpt: string
): Promise<void> {
  if (!escalation.should_escalate || !escalation.trigger) return;

  const supabase = await createClient();

  // Dedup check — don't create a duplicate if same trigger is already open this week
  const { data: existing } = await supabase
    .from("exception_event")
    .select("id")
    .eq("project_id", projectId)
    .eq("candidate_id", candidateId)
    .eq("week_no", weekNumber)
    .eq("event_type", escalation.trigger)
    .is("resolved_at", null)
    .maybeSingle();

  if (existing) return; // already flagged this week

  const { error } = await supabase.from("exception_event").insert({
    project_id:   projectId,
    candidate_id: candidateId,
    mentor_id:    mentorId,
    week_no:      weekNumber,
    event_type:   escalation.trigger,
    notes:        escalation.reason?.substring(0, 140) ?? null,
    source:       "chatbot",
    chat_excerpt: chatExcerpt.substring(0, 500),
  });

  if (error) {
    // Log but don't throw — a failed escalation write must not break the chat response
    console.error("[escalation insert error]", error);
  }
}