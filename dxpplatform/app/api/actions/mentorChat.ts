"use server";

import { VertexAI } from "@google-cloud/vertexai";
import { createClient } from "@/lib/supabase/server";
import { getMentorContext } from "@/lib/getMentorContext";
import { buildMentorSystemPrompt } from "@/lib/buildMentorSystemPrompt";

type Message = { sender: "user" | "assistant"; content: string };

export async function sendMentorMessage(
  projectId: string,
  sessionId: string,
  message: string,
  history: Message[]
): Promise<{ reply: string }> {

  // 1. Authenticate
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Unauthorized");

  // 2. Verify mentor is assigned to this project
  const { data: assignment } = await supabase
    .from("mentor_assignment")
    .select("id")
    .eq("project_id", projectId)
    .eq("mentor_id", user.id)
    .single();

  if (!assignment) throw new Error("Forbidden — you are not assigned to this project");

  // 3. Build context + system prompt
  const ctx = await getMentorContext(projectId, user.id);
  const systemPrompt = buildMentorSystemPrompt(ctx);

  // 4. Format history for Gemini (trim to last 10 to avoid token overflow)
  const trimmedHistory = history.slice(-10);
  const formattedHistory = trimmedHistory.map((m) => ({
    role: m.sender === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }));

  // 5. Call Gemini via Vertex AI
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

  const reply =
    result.response?.candidates?.[0]?.content?.parts?.[0]?.text ??
    "Sorry, I could not generate a response.";

  // 6. Save both messages to Supabase
  await supabase.from("chat_message").insert([
    { session_id: sessionId, sender: "user",      content: message },
    { session_id: sessionId, sender: "assistant", content: reply   },
  ]);

  return { reply };
}