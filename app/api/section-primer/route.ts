import { NextRequest } from "next/server";
import {
  KnowledgeLevel,
  KNOWLEDGE_LEVELS,
  KNOWLEDGE_LEVEL_LABELS,
  getSectionCardFormattingPrompt,
} from "@/lib/prompts";
import { BOOK_1_SECTIONS } from "@/lib/sections";
import { createSupabaseServerClient } from "@/lib/supabase";
import { cachedContentStream, withCaching } from "@/lib/card-cache";

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "OpenRouter API key not configured" },
      { status: 500 }
    );
  }

  let sectionId: string, level: KnowledgeLevel, cardType: "before" | "after";
  try {
    const body = await request.json();
    sectionId = body.sectionId;
    level = body.level;
    cardType = body.cardType;
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!sectionId || !level || !cardType) {
    return Response.json(
      { error: "sectionId, level, and cardType are required" },
      { status: 400 }
    );
  }

  if (!KNOWLEDGE_LEVELS.includes(level)) {
    return Response.json({ error: "Invalid level" }, { status: 400 });
  }

  const section = BOOK_1_SECTIONS.find((s) => s.id === sectionId);
  if (!section) {
    return Response.json({ error: "Section not found" }, { status: 400 });
  }

  const cacheKey = `section:${sectionId}:${cardType}:${level}:v3`;
  const supabase = createSupabaseServerClient();

  // Check cache first
  const { data: cached } = await supabase
    .from("section_card_cache")
    .select("content")
    .eq("cache_key", cacheKey)
    .maybeSingle();

  if (cached?.content) {
    return new Response(cachedContentStream(cached.content), {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  // Cache miss — generate and cache while streaming
  const rawPrompt = cardType === "before" ? section.beforePrompt : section.afterPrompt;
  let resolvedPrompt = rawPrompt.replace("[LEVEL]", KNOWLEDGE_LEVEL_LABELS[level]);
  const formattingPrompt = getSectionCardFormattingPrompt(cardType);

  if (cardType === "after") {
    resolvedPrompt =
      `Your response must open with one plain sentence — no more — that states the narrative fact: what just happened in this section, where we now are in the poem. Then continue with your insight as instructed.\n\n${formattingPrompt}\n\n` +
      resolvedPrompt;
  } else {
    resolvedPrompt = `${formattingPrompt}\n\n${resolvedPrompt}`;
  }

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
        messages: [{ role: "user", content: resolvedPrompt }],
        stream: true,
        max_tokens: 1200,
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

  return new Response(withCaching(upstream.body!, cacheKey, supabase), {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
