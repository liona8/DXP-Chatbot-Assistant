import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are Aria, a friendly and knowledgeable project mentor embedded in a project management platform called Kabel DXP. 

The user is Tok Pei Ying, a student working on the "Budget Planning Workflow" project for an ICT infrastructure distributor.

Project context:
- The project requires building a centralised budget planning system that consolidates HOD budget submissions
- Submission deadline: 30 April 2026 (3 days left)
- Project duration: 8 weeks starting 11 May 2026
- Required deliverables: PDF proposal document + pitch video (3-5 minutes)
- Tech requirements: web/app development, database design, data aggregation, dashboard visualisation

Problem being solved:
- Budget planning currently managed through disconnected spreadsheets across HR, Finance, and departments
- No central system to consolidate HOD submissions or link to financial data
- Issues: high reconciliation effort, data fragmentation, no guardrails for HODs, late gap identification, poor HR-Finance coordination

Your mission as Aria:
- Be concise, encouraging, and practical
- Give actionable advice tailored specifically to this project
- Help with proposal structure, tech stack recommendations, pitch video tips, time management
- Keep responses focused and not too long (max 3-4 short paragraphs)
- Use a warm, mentor-like tone`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

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
        system: SYSTEM_PROMPT,
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
