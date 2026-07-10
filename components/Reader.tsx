"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { book1, getLineRange } from "@/lib/paradise-lost";
import { getAnchorForLine, type Anchor } from "@/lib/anchors";
import type { KnowledgeLevel } from "@/lib/prompts";
import { BOOK_1_SECTIONS } from "@/lib/sections";
import type { Achievement } from "@/lib/types";
import SectionCard from "./SectionCard";
import Primer from "./Primer";

interface ReaderProps {
  level: KnowledgeLevel;
  activeLines: { start: number; end: number } | null;
  onAnnotateRequest: (
    passage: string,
    lineRange: string,
    lines: { start: number; end: number },
    anchorId?: string
  ) => void;
  onChatRequest: (passage: string) => void;
  completedSections: Set<string>;
  onSectionComplete: (sectionId: string, achievements: Achievement[]) => void;
  onSectionVisible: (sectionId: string) => void;
  showFirstHint: boolean;
}

interface TriggerState {
  text: string;
  lineRange: string;
  lines: { start: number; end: number };
  viewportX: number;
  viewportY: number;
}

interface VocabCard {
  lineNumber: number;
  word: string;
  definition: string;
  etymology: string;
}

interface VocabHoverState {
  card: VocabCard;
  viewportX: number;
  viewportY: number;
}

function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
}

function getLineRangeFromSelection(
  selection: Selection
): { start: number; end: number } | null {
  if (!selection.rangeCount) return null;
  const range = selection.getRangeAt(0);
  const lineSpans = document.querySelectorAll("[data-line]");
  const covered: number[] = [];
  lineSpans.forEach((span) => {
    if (range.intersectsNode(span)) {
      const n = parseInt(span.getAttribute("data-line") || "", 10);
      if (!isNaN(n)) covered.push(n);
    }
  });
  if (covered.length === 0) return null;
  return { start: Math.min(...covered), end: Math.max(...covered) };
}

// Total pages: 0 = "Before You Begin" primer, 1–6 = sections
const TOTAL_PAGES = 1 + BOOK_1_SECTIONS.length;

// "darkness visible" — the line the one-time enrichment hint points at
const FIRST_HINT_LINE = 63;

export default function Reader({
  level,
  activeLines,
  onAnnotateRequest,
  onChatRequest,
  completedSections,
  onSectionComplete,
  onSectionVisible,
  showFirstHint,
}: ReaderProps) {
  const { lines } = book1;
  const [currentPage, setCurrentPage] = useState(0);
  const [trigger, setTrigger] = useState<TriggerState | null>(null);
  // Touch devices get tap-to-select-a-line instead of fiddly native text selection
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);

  useEffect(() => {
    setIsCoarsePointer(window.matchMedia("(pointer: coarse)").matches);
  }, []);
  const [vocabByLine, setVocabByLine] = useState<Map<number, Map<string, VocabCard>>>(
    new Map()
  );
  const [hoveredVocab, setHoveredVocab] = useState<VocabHoverState | null>(null);
  const articleRef = useRef<HTMLElement>(null);

  const isPrimerPage = currentPage === 0;
  const currentSection = isPrimerPage ? null : BOOK_1_SECTIONS[currentPage - 1];

  // Fire onSectionVisible immediately on section page change
  useEffect(() => {
    if (!isPrimerPage && currentSection) {
      onSectionVisible(currentSection.id);
    }
    window.scrollTo({ top: 0 });
  }, [currentPage]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false;

    async function loadVocabCards() {
      try {
        const res = await fetch("/api/vocab?chapterId=book1");
        if (!res.ok) return;
        const cards = (await res.json()) as VocabCard[];
        if (cancelled) return;

        const next = new Map<number, Map<string, VocabCard>>();
        for (const card of cards) {
          if (!next.has(card.lineNumber)) {
            next.set(card.lineNumber, new Map());
          }
          next.get(card.lineNumber)!.set(normalizeWord(card.word), card);
        }
        setVocabByLine(next);
      } catch {
        // Keep reader usable even if vocab loading fails.
      }
    }

    loadVocabCards();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelectionEnd = useCallback(() => {
    const selection = window.getSelection();

    if (!selection || selection.isCollapsed) {
      setTrigger(null);
      return;
    }

    const text = selection.toString().trim();
    if (text.length < 2) {
      setTrigger(null);
      return;
    }

    // Only trigger if selection is within the poem
    const range = selection.getRangeAt(0);
    if (!articleRef.current?.contains(range.commonAncestorContainer)) {
      setTrigger(null);
      return;
    }

    const lineRange = getLineRangeFromSelection(selection);
    if (!lineRange) {
      setTrigger(null);
      return;
    }

    const rect = range.getBoundingClientRect();
    const lineRangeStr =
      lineRange.start === lineRange.end
        ? `${lineRange.start}`
        : `${lineRange.start}–${lineRange.end}`;

    // Position trigger just below/right of selection end, clamped to viewport
    const x = Math.min(rect.right + 8, window.innerWidth - 130);
    const y = rect.bottom + 6;

    setTrigger({ text, lineRange: lineRangeStr, lines: lineRange, viewportX: x, viewportY: y });
  }, []);

  // Dismiss trigger when clicking outside the poem or the trigger button
  useEffect(() => {
    function onDocumentMouseDown(e: MouseEvent) {
      const target = e.target as Element;
      if (
        target.closest('[data-annotation-trigger="true"]') ||
        articleRef.current?.contains(target)
      )
        return;
      setTrigger(null);
    }
    document.addEventListener("mousedown", onDocumentMouseDown);
    return () => document.removeEventListener("mousedown", onDocumentMouseDown);
  }, []);

  function openAnchor(anchor: Anchor) {
    const passage = getLineRange(anchor.lineStart, anchor.lineEnd)
      .map((l) => l.text)
      .join("\n");
    const rangeStr =
      anchor.lineStart === anchor.lineEnd
        ? `${anchor.lineStart}`
        : `${anchor.lineStart}–${anchor.lineEnd}`;
    onAnnotateRequest(
      passage,
      rangeStr,
      { start: anchor.lineStart, end: anchor.lineEnd },
      anchor.id
    );
    setTrigger(null);
    window.getSelection()?.removeAllRanges();
  }

  function handleLineClick(
    e: React.MouseEvent,
    line: { number: number; text: string }
  ) {
    // A real text selection takes priority over click-to-open
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) return;

    // Curated anchor lines open their annotation on click, any device
    const anchor = getAnchorForLine(line.number);
    if (anchor) {
      openAnchor(anchor);
      return;
    }

    // Touch devices: tapping any other line selects it whole
    if (!isCoarsePointer) return;
    const x = Math.min(e.clientX + 8, window.innerWidth - 240);
    const y = e.clientY + 16;
    setTrigger({
      text: line.text,
      lineRange: `${line.number}`,
      lines: { start: line.number, end: line.number },
      viewportX: Math.max(12, x),
      viewportY: y,
    });
  }

  function handleTriggerClick() {
    if (!trigger) return;
    onAnnotateRequest(trigger.text, trigger.lineRange, trigger.lines);
    setTrigger(null);
    window.getSelection()?.removeAllRanges();
  }

  function handleChatClick() {
    if (!trigger) return;
    onChatRequest(trigger.text);
    setTrigger(null);
    window.getSelection()?.removeAllRanges();
  }

  const currentSectionLines = currentSection
    ? lines.filter(
        (l) => l.number >= currentSection.lineStart && l.number <= currentSection.lineEnd
      )
    : [];

  const isFirstPage = currentPage === 0;
  const isLastPage = currentPage === TOTAL_PAGES - 1;

  return (
    <>
      <article
        ref={articleRef}
        onMouseUp={handleSelectionEnd}
        onTouchEnd={handleSelectionEnd}
        data-poem="true"
        style={{
          fontFamily: "var(--font-lora), Georgia, 'Times New Roman', serif",
        }}
      >
        {isPrimerPage ? (
          <Primer level={level} />
        ) : (
          currentSection && (
            <React.Fragment key={currentSection.id}>
              <SectionCard
                cardType="before"
                section={currentSection}
                level={level}
                onSectionVisible={onSectionVisible}
              />
              {currentSectionLines.map((line) => {
                const showNumber = line.number % 5 === 0 || line.number === 1;
                const isActive =
                  activeLines !== null &&
                  line.number >= activeLines.start &&
                  line.number <= activeLines.end;
                const isHintLine =
                  showFirstHint && line.number === FIRST_HINT_LINE;
                const anchor = getAnchorForLine(line.number);
                const isAnchorStart = anchor?.lineStart === line.number;
                const isTapped =
                  isCoarsePointer &&
                  trigger !== null &&
                  line.number >= trigger.lines.start &&
                  line.number <= trigger.lines.end;

                return (
                  <React.Fragment key={line.number}>
                  <div
                    onClick={(e) => handleLineClick(e, line)}
                    className={anchor ? "anchor-line" : undefined}
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      lineHeight: "1.85",
                      minHeight: "1.85em",
                      marginLeft: "-6px",
                      paddingLeft: "6px",
                      paddingRight: "6px",
                      borderRadius: "3px",
                      background:
                        isActive || isTapped
                          ? "rgba(201, 168, 76, 0.07)"
                          : "transparent",
                      transition: "background 0.3s ease",
                    }}
                  >
                    {/* Line number */}
                    <span
                      style={{
                        display: "inline-block",
                        width: "48px",
                        minWidth: "48px",
                        textAlign: "right",
                        paddingRight: "20px",
                        fontFamily:
                          "var(--font-cormorant), Georgia, 'Times New Roman', serif",
                        fontSize: "12px",
                        color: isAnchorStart
                          ? "rgba(201, 168, 76, 0.65)"
                          : showNumber
                            ? "#4a4540"
                            : "transparent",
                        userSelect: "none",
                        flexShrink: 0,
                        transition: "color 0.3s ease",
                      }}
                    >
                      {isAnchorStart ? "✦" : line.number}
                    </span>

                    {/* Poem text */}
                    <span
                      data-line={line.number}
                      style={{
                        fontSize: "18px",
                        color: isActive ? "#f8f4ec" : "#f0ebe2",
                        letterSpacing: "0.01em",
                        cursor: anchor ? "pointer" : "text",
                        transition: "color 0.3s ease",
                        borderBottom:
                          isHintLine || anchor
                            ? "1px dotted rgba(201, 168, 76, 0.45)"
                            : undefined,
                      }}
                    >
                      {(line.text.match(/(\s+|[^\s]+)/g) ?? [line.text]).map(
                        (token, index) => {
                          if (/^\s+$/.test(token)) return token;
                          const vocab = vocabByLine
                            .get(line.number)
                            ?.get(normalizeWord(token));
                          if (!vocab) return token;

                          return (
                            <span
                              key={`${line.number}-${index}`}
                              className="vocab-hover-word"
                              onMouseEnter={(event) => {
                                const rect = (
                                  event.currentTarget as HTMLSpanElement
                                ).getBoundingClientRect();
                                setHoveredVocab({
                                  card: vocab,
                                  viewportX: rect.left + rect.width / 2,
                                  viewportY: rect.top,
                                });
                              }}
                              onMouseLeave={() => setHoveredVocab(null)}
                            >
                              {token}
                            </span>
                          );
                        }
                      )}
                    </span>
                  </div>
                  {isHintLine && (
                    <p
                      style={{
                        margin: "2px 0 12px",
                        paddingLeft: "48px",
                        fontFamily:
                          "var(--font-cormorant), Georgia, 'Times New Roman', serif",
                        fontSize: "13px",
                        fontStyle: "italic",
                        letterSpacing: "0.05em",
                        color: "#8a6c28",
                        userSelect: "none",
                      }}
                    >
                      {isCoarsePointer
                        ? "✦ Tap this line — see what a 1667 reader saw"
                        : "✦ Click this line — see what a 1667 reader saw"}
                    </p>
                  )}
                  </React.Fragment>
                );
              })}
              <SectionCard
                cardType="after"
                section={currentSection}
                level={level}
                isCompleted={completedSections.has(currentSection.id)}
                onComplete={(achievements) =>
                  onSectionComplete(currentSection.id, achievements)
                }
              />
            </React.Fragment>
          )
        )}
      </article>

      {/* Pagination navigation */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "28px",
          padding: "24px 0 40px",
        }}
      >
        <button
          onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
          disabled={isFirstPage}
          style={{
            background: "transparent",
            border: "none",
            cursor: isFirstPage ? "default" : "pointer",
            color: isFirstPage ? "#2a2820" : "#8a847a",
            fontFamily: "var(--font-cormorant), Georgia, serif",
            fontSize: "16px",
            letterSpacing: "0.04em",
            padding: "4px 0",
            transition: "color 0.15s ease",
          }}
          onMouseEnter={(e) => {
            if (!isFirstPage)
              (e.currentTarget as HTMLButtonElement).style.color = "#f0ebe2";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = isFirstPage
              ? "#2a2820"
              : "#8a847a";
          }}
        >
          ← Prev
        </button>

        {/* Dots: primer + 6 sections */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {/* Primer dot — diamond shape via border-radius */}
          <button
            onClick={() => setCurrentPage(0)}
            title="Before You Begin"
            style={{
              width: currentPage === 0 ? "10px" : "7px",
              height: currentPage === 0 ? "10px" : "7px",
              borderRadius: "2px",
              transform: "rotate(45deg)",
              background: currentPage === 0 ? "#c9a84c" : "#2a2820",
              border: currentPage === 0 ? "none" : "1px solid #3a3830",
              cursor: "pointer",
              padding: 0,
              transition: "all 0.2s ease",
            }}
          />

          {/* Section dots */}
          {BOOK_1_SECTIONS.map((section, i) => {
            const pageIndex = i + 1;
            return (
              <button
                key={section.id}
                onClick={() => setCurrentPage(pageIndex)}
                title={section.title}
                style={{
                  width: currentPage === pageIndex ? "10px" : "7px",
                  height: currentPage === pageIndex ? "10px" : "7px",
                  borderRadius: "50%",
                  background: currentPage === pageIndex ? "#c9a84c" : "#2a2820",
                  border:
                    currentPage === pageIndex ? "none" : "1px solid #3a3830",
                  cursor: "pointer",
                  padding: 0,
                  transition: "all 0.2s ease",
                }}
              />
            );
          })}
        </div>

        <button
          onClick={() => setCurrentPage((p) => Math.min(TOTAL_PAGES - 1, p + 1))}
          disabled={isLastPage}
          style={{
            background: "transparent",
            border: "none",
            cursor: isLastPage ? "default" : "pointer",
            color: isLastPage ? "#2a2820" : "#8a847a",
            fontFamily: "var(--font-cormorant), Georgia, serif",
            fontSize: "16px",
            letterSpacing: "0.04em",
            padding: "4px 0",
            transition: "color 0.15s ease",
          }}
          onMouseEnter={(e) => {
            if (!isLastPage)
              (e.currentTarget as HTMLButtonElement).style.color = "#f0ebe2";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = isLastPage
              ? "#2a2820"
              : "#8a847a";
          }}
        >
          Next →
        </button>
      </div>

      {/* Selection trigger buttons */}
      {trigger && (
        <div
          data-annotation-trigger="true"
          style={{
            position: "fixed",
            left: trigger.viewportX,
            top: trigger.viewportY,
            zIndex: 60,
            display: "flex",
            gap: "6px",
            pointerEvents: "auto",
          }}
        >
          <button
            onClick={handleTriggerClick}
            style={{
              background: "#1c1b18",
              border: "1px solid #c9a84c",
              borderRadius: "3px",
              padding: "5px 13px 6px",
              cursor: "pointer",
              color: "#c9a84c",
              fontFamily: "var(--font-cormorant), Georgia, serif",
              fontSize: "14px",
              fontWeight: 500,
              letterSpacing: "0.06em",
              boxShadow: "0 2px 16px rgba(0,0,0,0.5)",
              whiteSpace: "nowrap",
              transition: "background 0.1s ease, color 0.1s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "#c9a84c";
              (e.currentTarget as HTMLButtonElement).style.color = "#0d0d0e";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "#1c1b18";
              (e.currentTarget as HTMLButtonElement).style.color = "#c9a84c";
            }}
          >
            ✦ Enrich
          </button>
          <button
            onClick={handleChatClick}
            style={{
              background: "#1c1b18",
              border: "1px solid #4a4540",
              borderRadius: "3px",
              padding: "5px 13px 6px",
              cursor: "pointer",
              color: "#8a847a",
              fontFamily: "var(--font-cormorant), Georgia, serif",
              fontSize: "14px",
              fontWeight: 500,
              letterSpacing: "0.06em",
              boxShadow: "0 2px 16px rgba(0,0,0,0.5)",
              whiteSpace: "nowrap",
              transition: "background 0.1s ease, color 0.1s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "#2a2820";
              (e.currentTarget as HTMLButtonElement).style.color = "#f0ebe2";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "#1c1b18";
              (e.currentTarget as HTMLButtonElement).style.color = "#8a847a";
            }}
          >
            Ask in Chat
          </button>
        </div>
      )}

      {hoveredVocab && (
        <div
          className="vocab-hover-tooltip"
          style={{
            left: hoveredVocab.viewportX,
            top: Math.max(12, hoveredVocab.viewportY - 8),
          }}
          role="tooltip"
        >
          <p className="vocab-hover-tooltip-word">{hoveredVocab.card.word}</p>
          <p className="vocab-hover-tooltip-definition">
            {hoveredVocab.card.definition}
          </p>
          {hoveredVocab.card.etymology && (
            <p className="vocab-hover-tooltip-etymology">
              {hoveredVocab.card.etymology}
            </p>
          )}
        </div>
      )}
    </>
  );
}
