import { NextRequest } from "next/server";
import {
  getAnnotationMessages,
  getAnchorAnnotationMessages,
  KnowledgeLevel,
} from "@/lib/prompts";
import { getAnchorById } from "@/lib/anchors";
import { cachedContentStream } from "@/lib/card-cache";
import { createSupabaseServerClient } from "@/lib/supabase";
import { checkAndUnlockAchievements } from "@/lib/achievements";

// Curated anchor passages use the premium model; free selection uses Sonnet.
const ANNOTATION_MODEL = "anthropic/claude-sonnet-5";
const ANCHOR_MODEL = "anthropic/claude-opus-4.8";

function parseLineRange(
  lineRange: string
): { lineStart: number | null; lineEnd: number | null } {
  if (!lineRange) return { lineStart: null, lineEnd: null };
  const cleaned = lineRange.replace(/\s+/g, "");
  const rangeMatch = cleaned.match(/^(\d+)[-–](\d+)$/);
  if (rangeMatch) {
    return { lineStart: Number(rangeMatch[1]), lineEnd: Number(rangeMatch[2]) };
  }
  const singleMatch = cleaned.match(/^(\d+)$/);
  if (singleMatch) {
    const value = Number(singleMatch[1]);
    return { lineStart: value, lineEnd: value };
  }
  return { lineStart: null, lineEnd: null };
}

async function resolveBook1ChapterId() {
  const supabase = createSupabaseServerClient();
  const { data: book } = await supabase
    .from("books")
    .select("id")
    .eq("gutenberg_id", 26)
    .single();

  if (!book) return null;

  const { data: chapter } = await supabase
    .from("chapters")
    .select("id")
    .eq("book_id", book.id)
    .eq("number", 1)
    .single();

  return chapter?.id ?? null;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "OpenRouter API key not configured" },
      { status: 500 }
    );
  }

  let passage: string, lineRange: string, level: KnowledgeLevel;
  let anchorId: string | undefined;
  try {
    const body = await request.json();
    passage = body.passage;
    lineRange = body.lineRange;
    level = body.level;
    anchorId = body.anchorId;
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!passage || !level) {
    return Response.json(
      { error: "passage and level are required" },
      { status: 400 }
    );
  }

  const anchor = anchorId ? getAnchorById(anchorId) : undefined;
  if (anchorId && !anchor) {
    return Response.json({ error: "Unknown anchor" }, { status: 400 });
  }

  const existingSessionId = request.cookies.get("gb_session")?.value;
  const sessionId = existingSessionId || crypto.randomUUID();
  const { lineStart, lineEnd } = parseLineRange(lineRange);
  const supabase = createSupabaseServerClient();

  const headers = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "X-Content-Type-Options": "nosniff",
  });
  if (!existingSessionId) {
    headers.append(
      "Set-Cookie",
      `gb_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`
    );
  }

  // Anchor passages are curated: serve from cache when already generated.
  const anchorCacheKey = anchor ? `anchor:${anchor.id}:${level}:v1` : null;
  if (anchorCacheKey) {
    const { data: cached } = await supabase
      .from("section_card_cache")
      .select("content")
      .eq("cache_key", anchorCacheKey)
      .maybeSingle();

    if (cached?.content) {
      // Still record the visit in the reader's journal — fire-and-forget
      void (async () => {
        try {
          const chapterId = await resolveBook1ChapterId();
          await supabase.from("annotation_history").insert({
            session_id: sessionId,
            chapter_id: chapterId,
            line_start: lineStart,
            line_end: lineEnd,
            passage,
            knowledge_level: level,
            annotation_content: cached.content,
          });
        } catch {}
      })();

      return new Response(cachedContentStream(cached.content), { headers });
    }
  }

  const messages = anchor
    ? getAnchorAnnotationMessages(passage, lineRange || "?", level, anchor.angle)
    : getAnnotationMessages(passage, lineRange || "?", level);

  let upstream: Response;
  try {
    upstream = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer":
            process.env.NEXT_PUBLIC_SITE_URL || "https://greatbooks.vercel.app",
          "X-Title": "Great Books",
        },
        body: JSON.stringify({
          model: anchor ? ANCHOR_MODEL : ANNOTATION_MODEL,
          messages,
          stream: true,
          max_tokens: 10000,
        }),
      }
    );
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

  if (!upstream.body) {
    return Response.json(
      { error: "OpenRouter returned an empty stream" },
      { status: 502 }
    );
  }

  const chapterId = await resolveBook1ChapterId();

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let completionText = "";

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);

          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (!data || data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (typeof delta === "string") {
                completionText += delta;
              }
            } catch {
              // Skip malformed SSE chunks while preserving stream passthrough.
            }
          }
        }

        if (completionText.trim().length > 0) {
          await supabase.from("annotation_history").insert({
            session_id: sessionId,
            chapter_id: chapterId,
            line_start: lineStart,
            line_end: lineEnd,
            passage,
            knowledge_level: level,
            annotation_content: completionText,
          });

          // Anchor annotations are generated once, then served from cache
          if (anchorCacheKey) {
            try {
              await supabase.from("section_card_cache").upsert(
                { cache_key: anchorCacheKey, content: completionText },
                { onConflict: "cache_key" }
              );
            } catch {
              // Non-fatal — next request regenerates
            }
          }

          // Reading streak — fire-and-forget, non-blocking
          void (async () => {
            try {
              await supabase.rpc("upsert_reading_streak", {
                p_session_id: sessionId,
                p_annotations: 1,
              });
            } catch {}
          })();

          // Achievement check — emit result as final SSE event
          try {
            const achievements = await checkAndUnlockAchievements(sessionId);
            if (achievements.length > 0) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ achievements })}\n\n`
                )
              );
            }
          } catch {
            // Non-fatal
          }
        }

        controller.close();
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              error: `Annotation stream interrupted: ${String(error)}`,
            })}\n\n`
          )
        );
        controller.close();
      } finally {
        reader.releaseLock();
      }
    },
  });

  return new Response(stream, { headers });
}
