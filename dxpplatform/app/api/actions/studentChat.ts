"use server";

import { VertexAI } from "@google-cloud/vertexai";
import { createClient } from "@/lib/supabase/server";
import { getStudentContext } from "@/lib/getStudentContext";
import { buildStudentSystemPrompt } from "@/lib/buildStudentSystemPrompt";
import {
  parseEscalationBlock,
  stripEscalationBlock,
  handleEscalation,
} from "@/lib/handleEscalation";

type Message = { sender: "user" | "assistant"; content: string };

export async function sendStudentMessage(
  projectId: string,
  sessionId: string,
  message: string,
  history: Message[]
): Promise<{ reply: string; escalated: boolean; escalation_trigger: string | null }> {

  // 1. Authenticate
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Unauthorized");

  // 2. Verify student is on this project
  const { data: agreement } = await supabase
    .from("signed_agreement")
    .select("id")
    .eq("project_id", projectId)
    .eq("candidate_id", user.id)
    .single();

  if (!agreement) throw new Error("Forbidden — you are not assigned to this project");

  // 3. Get mentor ID + current week number
  const [projectRes, mentorRes] = await Promise.all([
    supabase
      .from("project")
      .select("project_start_date, project_duration_weeks")
      .eq("id", projectId)
      .single(),
    supabase
      .from("mentor_assignment")
      .select("mentor_id")
      .eq("project_id", projectId)
      .single(),
  ]);

  const weekNumber = projectRes.data?.project_start_date
    ? Math.min(
        Math.max(
          Math.ceil(
            (Date.now() - new Date(projectRes.data.project_start_date).getTime()) /
            (7 * 24 * 60 * 60 * 1000)
          ),
          1
        ),
        projectRes.data.project_duration_weeks ?? 8
      )
    : 1;

  // 4. Build context + system prompt
  const ctx = await getStudentContext(projectId, user.id);
  const systemPrompt = buildStudentSystemPrompt(ctx);

  // 5. Format history for Gemini (trim to last 10)
  const trimmedHistory = history.slice(-10);
  const formattedHistory = trimmedHistory.map((m) => ({
    role: m.sender === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }));

  // 6. Call Gemini via Vertex AI
  const vertex = new VertexAI({
    project:  process.env.GCP_PROJECT_ID!,
    location: process.env.GCP_LOCATION ?? "asia-southeast1",
  });

  const model = vertex.getGenerativeModel({
    model: "gemini-2.0-flash-lite",
    systemInstruction: systemPrompt,
  });

  const result = await model.generateContent({
    contents: [
      ...formattedHistory,
      { role: "user", parts: [{ text: message }] },
    ],
  });

  const rawReply =
    result.response?.candidates?.[0]?.content?.parts?.[0]?.text ??
    "Sorry, I could not generate a response.";

  // 7. Parse escalation and handle in background (does not block response)
  const escalation = parseEscalationBlock(rawReply);
  if (escalation && mentorRes.data?.mentor_id) {
    handleEscalation(
      escalation,
      projectId,
      user.id,
      mentorRes.data.mentor_id,
      weekNumber,
      message
    ).catch((err) => console.error("[background escalation error]", err));
  }

  // 8. Strip escalation block — student must never see the raw JSON
  const cleanReply = stripEscalationBlock(rawReply);

  // 9. Save messages
  await supabase.from("chat_message").insert([
    { session_id: sessionId, sender: "user",      content: message    },
    { session_id: sessionId, sender: "assistant", content: cleanReply },
  ]);

  return {
    reply:              cleanReply,
    escalated:          escalation?.should_escalate ?? false,
    escalation_trigger: escalation?.trigger ?? null,
  };
}