import { NextRequest, NextResponse } from "next/server";

interface ChatContext {
  userId?: string | null;
  userName?: string | null;
  projectId?: string | null;
  projectTitle?: string | null;
  companyName?: string | null;
  companyIndustry?: string | null;
  durationWeeks?: number | null;
  submissionEndDate?: string | null;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function formatDate(value?: string | null) {
  if (!value) return "Not provided";
  return new Date(value).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function buildSystemPrompt(context?: ChatContext) {
  const userName = context?.userName ?? "the student";
  const projectTitle = context?.projectTitle ?? "the selected project";
  const companyName = context?.companyName ?? "the project company";
  const companyIndustry = context?.companyIndustry ?? "the relevant industry";
  const duration = context?.durationWeeks ? `${context.durationWeeks} weeks` : "Not provided";

  return `You are Thinkra, a friendly and knowledgeable project mentor embedded in a project management platform called Kabel DXP.

Project context:
- User name: ${userName}
- User id: ${context?.userId ?? "Not provided"}
- Project id: ${context?.projectId ?? "Not provided"}
- Project title: ${projectTitle}
- Company: ${companyName}
- Industry: ${companyIndustry}
- Submission deadline: ${formatDate(context?.submissionEndDate)}
- Project duration: ${duration}
- Required deliverables: PDF proposal document + pitch video (3-5 minutes)

Your mission as Thinkra:
- Be concise, encouraging, and practical
- Give actionable advice tailored specifically to ${projectTitle}
- Help with proposal structure, tech stack recommendations, pitch video tips, time management
- Keep responses focused and not too long (max 3-4 short paragraphs)
- Use a warm, mentor-like tone`;
}

export async function POST(req: NextRequest) {
  try {
    const { messages, context } = (await req.json()) as {
      messages: ChatMessage[];
      context?: ChatContext;
    };

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: buildSystemPrompt(context),
        messages,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.error?.message || "API request failed" },
        { status: response.status }
      );
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";

    return NextResponse.json({ content: text });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
