"use server";

import { cookies } from "next/headers";
import { VertexAI } from "@google-cloud/vertexai";

import { createAdminClient } from "@/lib/supabase/admin";
import { getStudentContext } from "@/lib/getStudentContext";
import type { ChatHistoryMessage } from "@/types/chat";
import { buildStudentSystemPrompt } from "@/lib/buildStudentSystemPrompt";

import {
  parseEscalationBlock,
  stripEscalationBlock,
  handleEscalation,
} from "@/lib/handleEscalation";

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

async function getStudentSession(): Promise<{
  id: string;
  role: "candidate";
}> {
  const cookieStore = await cookies();

  const session = readSession(
    cookieStore.get("dxp_user")?.value
  );

  if (!session?.id || session.role !== "candidate") {
    throw new Error("Unauthorized");
  }

  return {
    id: session.id,
    role: "candidate",
  };
}

async function verifyStudentProjectAccess(
  projectId: string,
  studentId: string
) {
  const supabase = createAdminClient();

  // 1. Check signed agreement
  const { data: agreement } = await supabase
    .from("signed_agreement")
    .select("id")
    .eq("project_id", projectId)
    .eq("candidate_id", studentId)
    .maybeSingle();

  // 2. Check proposal
  const { data: proposal } = await supabase
    .from("proposal")
    .select("id")
    .eq("project_id", projectId)
    .eq("candidate_id", studentId)
    .maybeSingle();

  console.log("projectId:", projectId);
  console.log("studentId:", studentId);
  console.log("agreement:", agreement);
  console.log("proposal:", proposal);

  return supabase;
}

/**
 * GET OR CREATE CHAT SESSION
 */
export async function getStudentChatSession(
projectId: string) {
  const session = await getStudentSession();

  const supabase = await verifyStudentProjectAccess(
    projectId,
    session.id
  );

  const { data: chatSession, error: sessionError } =
    await supabase
      .from("chat_session")
      .upsert(
        {
          project_id: projectId,
          user_id: session.id,
          role: "candidate",
        },
        {
          onConflict: "project_id,user_id",
        }
      )
      .select("id")
      .single();

  if (sessionError || !chatSession) {
    throw new Error(
      sessionError?.message ??
        "Could not create student chat session"
    );
  }

  const { data: messages, error: messagesError } =
    await supabase
      .from("chat_message")
      .select("session_id, sender, content, created_at")
      .eq("session_id", chatSession.id)
      .order("created_at", { ascending: true });

  if (messagesError) {
    throw new Error(messagesError.message);
  }

  return {
    sessionId: chatSession.id,
    messages: messages ?? [],
  };
}

/**
 * SEND MESSAGE
 */
export async function sendStudentMessage(
  projectId: string,
  sessionId: string,
  message: string,
  history: ChatHistoryMessage[]
): Promise<{
  reply: string;
  escalated: boolean;
  escalation_trigger: string | null;
}> {
  // 1. Authenticate
  const session = await getStudentSession();

  // 2. Verify access
  const supabase = await verifyStudentProjectAccess(
    projectId,
    session.id
  );

  // 3. Verify session ownership
  const { data: chatSession } = await supabase
    .from("chat_session")
    .select("id")
    .eq("id", sessionId)
    .eq("project_id", projectId)
    .eq("user_id", session.id)
    .maybeSingle();

  if (!chatSession) {
    throw new Error("Invalid chat session");
  }

  // 4. Get project + mentor info
  const [projectRes, mentorRes] = await Promise.all([
    supabase
      .from("project")
      .select("project_start_date, project_duration_weeks")
      .eq("id", projectId)
      .maybeSingle(),

    supabase
      .from("mentor_assignment")
      .select("mentor_id")
      .eq("project_id", projectId)
      .maybeSingle(),
  ]);

  // 5. Calculate week number
  const weekNumber = projectRes.data?.project_start_date
    ? Math.min(
        Math.max(
          Math.ceil(
            (Date.now() -
              new Date(
                projectRes.data.project_start_date
              ).getTime()) /
              (7 * 24 * 60 * 60 * 1000)
          ),
          1
        ),
        projectRes.data.project_duration_weeks ?? 8
      )
    : 1;

  // 6. Build AI context
  const ctx = await getStudentContext(
    projectId,
    session.id
  );

  const systemPrompt =
    buildStudentSystemPrompt(ctx);

  // 7. Format history
  const trimmedHistory = history.slice(-10);

  const formattedHistory = trimmedHistory.map(
    (m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    })
  );

  // 8. Vertex AI
  const vertex = new VertexAI({
    project: process.env.GCP_PROJECT_ID!,
    location:
      process.env.GCP_LOCATION ??
      "asia-southeast1",
  });

  const model = vertex.getGenerativeModel({
    model:
      process.env.GEMINI_MODEL ??
      "gemini-3-flash-preview",
    systemInstruction: systemPrompt,
  });

  const result = await model.generateContent({
    contents: [
      ...formattedHistory,
      {
        role: "user",
        parts: [{ text: message }],
      },
    ],
  });

  const rawReply =
    result.response?.candidates?.[0]?.content
      ?.parts?.[0]?.text ??
    "Sorry, I could not generate a response.";

  // 9. Escalation handling
  const escalation =
    parseEscalationBlock(rawReply);

  if (
    escalation &&
    mentorRes.data?.mentor_id
  ) {
    handleEscalation(
      escalation,
      projectId,
      session.id,
      mentorRes.data.mentor_id,
      weekNumber,
      message
    ).catch((err) =>
      console.error(
        "[background escalation error]",
        err
      )
    );
  }

  const cleanReply =
    stripEscalationBlock(rawReply);

  // 10. Save messages
  await supabase.from("chat_message").insert([
    {
      session_id: sessionId,
      sender: "user",
      content: message,
    },
    {
      session_id: sessionId,
      sender: "assistant",
      content: cleanReply,
    },
  ]);

  return {
    reply: cleanReply,
    escalated:
      escalation?.should_escalate ?? false,
    escalation_trigger:
      escalation?.trigger ?? null,
  };
}