/**
 * Pre-warms the section_card_cache by requesting every primer and section
 * card combination through the app's own API routes (so cache keys and
 * prompts stay in lockstep with production code).
 *
 * Usage:
 *   npx tsx scripts/warm-cache.ts                       # against localhost:3000
 *   npx tsx scripts/warm-cache.ts https://your-app.com  # against production
 *
 * Reports word counts and flags responses that look truncated
 * (not ending in sentence punctuation).
 */
import "dotenv/config";
import { KNOWLEDGE_LEVELS } from "../lib/prompts";
import { BOOK_1_SECTIONS } from "../lib/sections";

const BASE_URL = process.argv[2] || "http://localhost:3000";
const CONCURRENCY = 3;

interface WarmTarget {
  label: string;
  request: () => Promise<Response>;
}

interface WarmResult {
  label: string;
  ok: boolean;
  words: number;
  truncated: boolean;
  tail: string;
  error?: string;
}

async function readSseContent(res: Response): Promise<string> {
  if (!res.body) throw new Error("no response body");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let content = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (typeof delta === "string") content += delta;
      } catch {
        // ignore malformed chunks
      }
    }
  }
  return content;
}

async function warm(target: WarmTarget): Promise<WarmResult> {
  try {
    const res = await target.request();
    if (!res.ok) {
      const text = await res.text();
      return {
        label: target.label,
        ok: false,
        words: 0,
        truncated: false,
        tail: "",
        error: `HTTP ${res.status}: ${text.slice(0, 120)}`,
      };
    }
    const content = await readSseContent(res);
    const words = content.split(/\s+/).filter(Boolean).length;
    const trimmed = content.trim();
    const truncated = trimmed.length > 0 && !/[.!?…"'”’)]$/.test(trimmed);
    return {
      label: target.label,
      ok: trimmed.length > 0,
      words,
      truncated,
      tail: trimmed.slice(-60).replace(/\n/g, " "),
      error: trimmed.length === 0 ? "empty response" : undefined,
    };
  } catch (err) {
    return {
      label: target.label,
      ok: false,
      words: 0,
      truncated: false,
      tail: "",
      error: String(err),
    };
  }
}

async function main() {
  const targets: WarmTarget[] = [];

  for (const level of KNOWLEDGE_LEVELS) {
    targets.push({
      label: `primer:${level}`,
      request: () => fetch(`${BASE_URL}/api/primer?level=${level}`),
    });
    for (const section of BOOK_1_SECTIONS) {
      for (const cardType of ["before", "after"] as const) {
        targets.push({
          label: `section:${section.id}:${cardType}:${level}`,
          request: () =>
            fetch(`${BASE_URL}/api/section-primer`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sectionId: section.id, level, cardType }),
            }),
        });
      }
    }
  }

  console.log(`Warming ${targets.length} cards against ${BASE_URL}\n`);

  const results: WarmResult[] = [];
  let next = 0;
  async function worker() {
    while (next < targets.length) {
      const target = targets[next++];
      const result = await warm(target);
      results.push(result);
      const status = result.error
        ? `FAIL   ${result.error}`
        : result.truncated
          ? `TRUNC? …${result.tail}`
          : `ok     ${result.words} words`;
      console.log(`${result.label.padEnd(38)} ${status}`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const failed = results.filter((r) => !r.ok || r.error);
  const truncated = results.filter((r) => r.ok && r.truncated);
  console.log(
    `\nDone: ${results.length - failed.length}/${results.length} warmed, ` +
      `${truncated.length} possibly truncated, ${failed.length} failed`
  );
  if (truncated.length > 0) {
    console.log("\nPossibly truncated (check and delete their cache rows to regenerate):");
    for (const r of truncated) console.log(`  ${r.label}  …${r.tail}`);
  }
  if (failed.length > 0) process.exitCode = 1;
}

main();
