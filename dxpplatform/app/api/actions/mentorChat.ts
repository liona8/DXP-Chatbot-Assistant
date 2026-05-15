"use server";

import { cookies } from "next/headers";
import { VertexAI } from "@google-cloud/vertexai";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMentorContext } from "@/lib/getMentorContext";
import { buildMentorSystemPrompt } from "@/lib/buildMentorSystemPrompt";

type Message = { sender: "user" | "assistant"; content: string; created_at?: string };

type SessionCookie = {
  id?: string;
  role?: string;
};

function readSession(value: string | undefined) {
  if (!value) return null;
  try {
    return JSON.parse(value) as SessionCookie;
  } catch {
    return null;
  }
}

async function getMentorSession(): Promise<{ id: string; role: "mentor" }> {
  const cookieStore = await cookies();
  const session = readSession(cookieStore.get("dxp_user")?.value);

  if (!session?.id || session.role !== "mentor") {
    throw new Error("Unauthorized");
  }

  return { id: session.id, role: "mentor" };
}

async function verifyMentorProjectAccess(projectId: string, mentorId: string) {
  const supabase = createAdminClient();
  const { data: assignment } = await supabase
    .from("mentor_assignment")
    .select("id")
    .eq("project_id", projectId)
    .eq("mentor_id", mentorId)
    .maybeSingle();

  if (!assignment) throw new Error("Forbidden - you are not assigned to this project");

  return supabase;
}

export async function getMentorChatSession(projectId: string): Promise<{
  sessionId: string;
  messages: Message[];
}> {
  const session = await getMentorSession();
  const supabase = await verifyMentorProjectAccess(projectId, session.id);

  const { data: chatSession, error: sessionError } = await supabase
    .from("chat_session")
    .upsert(
      { project_id: projectId, user_id: session.id, role: "mentor" },
      { onConflict: "project_id,user_id" }
    )
    .select("id")
    .single();

  if (sessionError || !chatSession) {
    throw new Error(sessionError?.message ?? "Could not create mentor chat session");
  }

  const { data: history, error: historyError } = await supabase
    .from("chat_message")
    .select("sender, content, created_at")
    .eq("session_id", chatSession.id)
    .order("created_at", { ascending: true });

  if (historyError) {
    throw new Error(historyError.message);
  }

  return {
    sessionId: chatSession.id,
    messages: (history ?? []) as Message[],
  };
}

export async function sendMentorMessage(
  projectId: string,
  sessionId: string,
  message: string,
  history: Message[]
): Promise<{ reply: string }> {
  // 1. Authenticate against this app's custom login cookie.
  const session = await getMentorSession();

  // 2. Verify mentor is assigned to this project.
  const supabase = await verifyMentorProjectAccess(projectId, session.id);

  const { data: chatSession } = await supabase
    .from("chat_session")
    .select("id")
    .eq("id", sessionId)
    .eq("project_id", projectId)
    .eq("user_id", session.id)
    .maybeSingle();

  if (!chatSession) throw new Error("Invalid chat session");

  // 3. Build context + system prompt.
  const ctx = await getMentorContext(projectId, session.id);
  const systemPrompt = buildMentorSystemPrompt(ctx);

  // 4. Format history for Gemini (trim to last 10 to avoid token overflow).
  const trimmedHistory = history.slice(-10);
  const formattedHistory = trimmedHistory.map((m) => ({
    role: m.sender === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }));

  // 5. Call Gemini via Vertex AI.
  const vertex = new VertexAI({
    project: process.env.GCP_PROJECT_ID!,
    location: process.env.GCP_LOCATION ?? "asia-southeast1",
  });

  const model = vertex.getGenerativeModel({
    model: process.env.GEMINI_MODEL ?? "gemini-3-flash-preview",
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

  // 6. Save both messages to Supabase.
  await supabase.from("chat_message").insert([
    { session_id: sessionId, sender: "user", content: message },
    { session_id: sessionId, sender: "assistant", content: reply },
  ]);

  return { reply };
}
