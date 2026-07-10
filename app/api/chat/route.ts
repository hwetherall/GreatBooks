import { NextRequest } from "next/server";
import { getChatSystemPrompt, KnowledgeLevel } from "@/lib/prompts";

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "OpenRouter API key not configured" },
      { status: 500 }
    );
  }

  let messages: Array<{ role: string; content: string }>, level: KnowledgeLevel;
  try {
    const body = await request.json();
    messages = body.messages;
    level = body.level;
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!messages || messages.length === 0 || !level) {
    return Response.json(
      { error: "messages and level are required" },
      { status: 400 }
    );
  }

  const systemPrompt = getChatSystemPrompt(level);
  const fullMessages = [
    { role: "system", content: systemPrompt },
    ...messages,
  ];

  let upstream: Response;
  try {
    upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer":
          process.env.NEXT_PUBLIC_SITE_URL || "https://greatbooks.vercel.app",
        "X-Title": "Great Books",
      },
      body: JSON.stringify({
        model: "anthropic/claude-sonnet-5",
        messages: fullMessages,
        stream: true,
        max_tokens: 10000,
      }),
    });
  } catch (err) {
    return Response.json(
      { error: `Failed to reach OpenRouter: ${err}` },
      { status: 502 }
    );
  }

  if (!upstream.ok) {
    const errText = await upstream.text();
    return Response.json(
      { error: `OpenRouter error: ${errText}` },
      { status: upstream.status }
    );
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
