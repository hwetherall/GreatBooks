"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import type { KnowledgeLevel } from "@/lib/prompts";
import type { Section } from "@/lib/sections";
import type { Achievement } from "@/lib/types";

interface SectionCardProps {
  section: Section;
  level: KnowledgeLevel;
  cardType: "before" | "after";
  isCompleted?: boolean;
  onComplete?: (achievements: Achievement[]) => void;
  onSectionVisible?: (sectionId: string) => void;
}

const mdComponents: Components = {
  h3: ({ children }) => (
    <h3
      style={{
        fontFamily: "var(--font-cormorant), Georgia, 'Times New Roman', serif",
        fontSize: "22px",
        lineHeight: 1.3,
        color: "#d5c089",
        margin: "0 0 0.7em",
        fontWeight: 500,
      }}
    >
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p
      style={{
        fontFamily: "var(--font-lora), Georgia, 'Times New Roman', serif",
        fontSize: "16px",
        lineHeight: 1.85,
        color: "#f0ebe2",
        margin: "0 0 1.1em",
      }}
    >
      {children}
    </p>
  ),
  strong: ({ children }) => (
    <strong style={{ fontWeight: 600, color: "#f8f4ec" }}>{children}</strong>
  ),
  em: ({ children }) => (
    <em style={{ fontStyle: "italic", color: "inherit" }}>{children}</em>
  ),
  ul: ({ children }) => (
    <ul
      style={{
        margin: "0 0 1.1em 1.25em",
        padding: 0,
        color: "#f0ebe2",
      }}
    >
      {children}
    </ul>
  ),
  li: ({ children }) => (
    <li
      style={{
        fontFamily: "var(--font-lora), Georgia, 'Times New Roman', serif",
        fontSize: "16px",
        lineHeight: 1.75,
        marginBottom: "0.4em",
      }}
    >
      {children}
    </li>
  ),
};

export default function SectionCard({
  section,
  level,
  cardType,
  isCompleted = false,
  onComplete,
  onSectionVisible,
}: SectionCardProps) {
  const [text, setText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localCompleted, setLocalCompleted] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset when level changes
  useEffect(() => {
    setText("");
    setIsStreaming(false);
    setError(null);
    setHasStarted(false);
  }, [level]);

  // Lazy-load trigger
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasStarted) {
          setHasStarted(true);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasStarted]);

  // Persistent visibility tracking for "current section" (before cards only)
  useEffect(() => {
    if (cardType !== "before" || !onSectionVisible) return;
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onSectionVisible(section.id);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [cardType, onSectionVisible, section.id]);

  useEffect(() => {
    if (!hasStarted) return;

    let cancelled = false;

    async function fetchCard() {
      setIsStreaming(true);
      setText("");
      setError(null);

      try {
        const res = await fetch("/api/section-primer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sectionId: section.id,
            level,
            cardType,
          }),
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
          for (const sseLine of chunk.split("\n")) {
            if (!sseLine.startsWith("data: ")) continue;
            const data = sseLine.slice(6).trim();
            if (data === "[DONE]") break;

            try {
              const parsed = JSON.parse(data);
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
          setError(err instanceof Error ? err.message : "Unable to load.");
        }
      } finally {
        if (!cancelled) setIsStreaming(false);
      }
    }

    fetchCard();
    return () => {
      cancelled = true;
    };
  }, [hasStarted, section.id, level, cardType, attempt]);

  async function handleMarkComplete() {
    setLocalCompleted(true);
    try {
      const res = await fetch("/api/section-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId: section.id }),
      });
      if (res.ok) {
        const data = await res.json();
        onComplete?.(data.unlockedAchievements ?? []);
      } else {
        onComplete?.([]);
      }
    } catch {
      onComplete?.([]);
    }
  }

  const divider = (
    <div
      style={{
        height: "1px",
        background: "linear-gradient(to right, #2a2820, transparent)",
        margin: "24px 0",
      }}
    />
  );

  const errorState = (
    <div>
      <p
        style={{
          fontFamily: "var(--font-lora), Georgia, serif",
          fontSize: "15px",
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
          fontFamily: "var(--font-cormorant), Georgia, 'Times New Roman', serif",
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
  );

  if (cardType === "before") {
    return (
      <div ref={containerRef} style={{ padding: "32px 0 24px" }}>
        {/* Section header */}
        <p
          style={{
            fontFamily:
              "var(--font-cormorant), Georgia, 'Times New Roman', serif",
            fontSize: "24px",
            color: "#7a7568",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            margin: "0 0 20px",
          }}
        >
          {section.romanNumeral} — {section.title}
        </p>

        {error ? (
          errorState
        ) : isStreaming && text.length === 0 ? (
          <p
            className="annotation-loading"
            style={{
              fontFamily:
                "var(--font-cormorant), Georgia, 'Times New Roman', serif",
              fontSize: "18px",
              fontStyle: "italic",
              color: "#4a4540",
              margin: 0,
            }}
          >
            Setting the scene…
          </p>
        ) : text ? (
          <ReactMarkdown components={mdComponents}>{text}</ReactMarkdown>
        ) : null}

        {!isStreaming && text && divider}
      </div>
    );
  }

  // "after" card
  return (
    <div ref={containerRef} style={{ padding: "24px 0 40px" }}>
      {divider}

      {error ? (
        errorState
      ) : isStreaming && text.length === 0 ? (
        <p
          className="annotation-loading"
          style={{
            fontFamily:
              "var(--font-cormorant), Georgia, 'Times New Roman', serif",
            fontSize: "18px",
            fontStyle: "italic",
            color: "#4a4540",
            margin: 0,
          }}
        >
          Reflecting…
        </p>
      ) : text ? (
        <ReactMarkdown components={mdComponents}>{text}</ReactMarkdown>
      ) : null}

      {!isStreaming && text && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
          {isCompleted || localCompleted ? (
            <span
              style={{
                color: "#4a4540",
                fontFamily:
                  "var(--font-cormorant), Georgia, 'Times New Roman', serif",
                fontSize: "14px",
              }}
            >
              ✓ Complete
            </span>
          ) : (
            <button
              onClick={handleMarkComplete}
              style={{
                color: "#8a847a",
                fontFamily:
                  "var(--font-cormorant), Georgia, 'Times New Roman', serif",
                fontSize: "14px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              Mark as complete →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
