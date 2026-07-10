"use client";

import { useEffect, useRef, useState } from "react";
import type { KnowledgeLevel } from "@/lib/prompts";
import type { Achievement } from "@/lib/types";

interface AnnotationCardProps {
  passage: string;
  lineRange: string;
  level: KnowledgeLevel;
  onClose: () => void;
  onComplete?: (achievements: Achievement[]) => void;
}

export default function AnnotationCard({
  passage,
  lineRange,
  level,
  onClose,
  onComplete,
}: AnnotationCardProps) {
  const [text, setText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Fetch annotation with streaming on mount
  useEffect(() => {
    let cancelled = false;

    async function fetchAnnotation() {
      setIsStreaming(true);
      setText("");
      setError(null);

      const pendingAchievements: Achievement[] = [];

      try {
        const res = await fetch("/api/annotate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ passage, lineRange, level }),
        });

        if (!res.ok) {
          let message = `Error ${res.status}`;
          try {
            const data = await res.json();
            message = data.error || message;
          } catch {
            /* ignore */
          }
          throw new Error(message);
        }

        if (!res.body) throw new Error("No response stream");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const sseLines = chunk.split("\n");

          for (const sseLine of sseLines) {
            if (!sseLine.startsWith("data: ")) continue;
            const data = sseLine.slice(6).trim();
            if (data === "[DONE]") break;

            try {
              const parsed = JSON.parse(data);
              // Achievement event emitted by route after stream ends
              if (Array.isArray(parsed.achievements)) {
                pendingAchievements.push(...(parsed.achievements as Achievement[]));
                continue;
              }
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta && !cancelled) {
                setText((prev) => prev + delta);
              }
            } catch {
              // Skip malformed SSE chunks
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load annotation. Please try again."
          );
        }
      } finally {
        if (!cancelled) {
          setIsStreaming(false);
          onComplete?.(pendingAchievements);
        }
      }
    }

    fetchAnnotation();
    return () => {
      cancelled = true;
    };
  }, [passage, lineRange, level, attempt]);

  // Close on Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const displayPassage =
    passage.length > 120 ? passage.slice(0, 120).trimEnd() + "…" : passage;

  return (
    <>
      {/* Backdrop — click to close */}
      <div
        onClick={onClose}
        className="annotation-backdrop"
        aria-hidden="true"
      />

      {/* Annotation panel */}
      <div className="annotation-panel" role="complementary" aria-label="Annotation">
        {/* Sticky header */}
        <div
          style={{
            position: "sticky",
            top: 0,
            background: "#141412",
            padding: "22px 24px 0",
            zIndex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "16px",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-cormorant), Georgia, serif",
                fontSize: "10px",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "#4a4540",
                paddingTop: "4px",
              }}
            >
              {lineRange.includes("–") ? `Lines ${lineRange}` : `Line ${lineRange}`}
            </span>

            <button
              onClick={onClose}
              aria-label="Close annotation"
              style={{
                background: "transparent",
                border: "none",
                color: "#4a4540",
                cursor: "pointer",
                fontSize: "22px",
                lineHeight: 1,
                padding: "0 0 0 8px",
                fontFamily: "Georgia, serif",
                transition: "color 0.15s ease",
                flexShrink: 0,
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.color = "#c9a84c")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.color = "#4a4540")
              }
            >
              ×
            </button>
          </div>

          {/* Quoted passage */}
          <blockquote
            style={{
              margin: "0 0 0 0",
              padding: "0 0 0 14px",
              borderLeft: "2px solid rgba(201, 168, 76, 0.35)",
              fontFamily:
                "var(--font-cormorant), Georgia, 'Times New Roman', serif",
              fontSize: "17px",
              fontStyle: "italic",
              lineHeight: 1.6,
              color: "#c9a84c",
            }}
          >
            &ldquo;{displayPassage}&rdquo;
          </blockquote>

          {/* Separator */}
          <div
            style={{
              height: "1px",
              background: "linear-gradient(to right, #2a2820, transparent)",
              margin: "20px 0 0",
            }}
          />
        </div>

        {/* Scrollable annotation body */}
        <div ref={bodyRef} style={{ padding: "20px 24px 40px", overflowY: "auto", flex: 1 }}>
          {error ? (
            <div>
              <p
                style={{
                  fontFamily: "var(--font-lora), Georgia, serif",
                  fontSize: "15px",
                  lineHeight: 1.7,
                  color: "#8a847a",
                  fontStyle: "italic",
                  margin: "0 0 10px",
                }}
              >
                {error}
              </p>
              <button
                onClick={() => setAttempt((a) => a + 1)}
                style={{
                  color: "#c9a84c",
                  fontFamily:
                    "var(--font-cormorant), Georgia, 'Times New Roman', serif",
                  fontSize: "14px",
                  letterSpacing: "0.04em",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Try again →
              </button>
            </div>
          ) : isStreaming && text.length === 0 ? (
            /* Loading state */
            <p
              style={{
                fontFamily: "var(--font-cormorant), Georgia, serif",
                fontSize: "17px",
                fontStyle: "italic",
                color: "#4a4540",
                margin: 0,
              }}
              className="annotation-loading"
            >
              Considering the passage…
            </p>
          ) : (
            /* Annotation text */
            <p
              style={{
                fontFamily: "var(--font-lora), Georgia, 'Times New Roman', serif",
                fontSize: "16px",
                lineHeight: 1.78,
                color: "#f0ebe2",
                margin: 0,
                whiteSpace: "pre-wrap",
              }}
            >
              {text}
              {isStreaming && <span className="annotation-cursor" aria-hidden="true" />}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
