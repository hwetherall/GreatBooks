"use client";

import { useState } from "react";
import {
  KnowledgeLevel,
  KNOWLEDGE_LEVELS,
  KNOWLEDGE_LEVEL_LABELS,
  KNOWLEDGE_LEVEL_DESCRIPTIONS,
} from "@/lib/prompts";

interface WelcomeOverlayProps {
  initialLevel: KnowledgeLevel;
  onBegin: (level: KnowledgeLevel) => void;
  onClose: () => void;
}

const DISPLAY = "var(--font-cormorant), Georgia, 'Times New Roman', serif";
const BODY = "var(--font-lora), Georgia, 'Times New Roman', serif";

const FEATURES: Array<{ name: string; blurb: string }> = [
  {
    name: "Context Stations",
    blurb:
      "Brief orientations before and after each passage — so you always know where you are in the story.",
  },
  {
    name: "Enrich",
    blurb:
      "Select any word, line, or passage and the AI decodes what a 1667 reader would have caught at a glance.",
  },
  {
    name: "Chat",
    blurb: "Ask anything about the poem as you read — an interlocutor, always beside you.",
  },
];

export default function WelcomeOverlay({
  initialLevel,
  onBegin,
  onClose,
}: WelcomeOverlayProps) {
  const [selected, setSelected] = useState<KnowledgeLevel>(initialLevel);

  const rule = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "14px",
        margin: "28px 0",
      }}
    >
      <span style={{ flex: 1, height: "1px", background: "#2a2820" }} />
      <span
        style={{
          width: "7px",
          height: "7px",
          background: "#c9a84c",
          transform: "rotate(45deg)",
        }}
      />
      <span style={{ flex: 1, height: "1px", background: "#2a2820" }} />
    </div>
  );

  return (
    <div
      className="welcome-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome"
    >
      <button
        onClick={onClose}
        aria-label="Close"
        style={{
          position: "fixed",
          top: "18px",
          right: "20px",
          background: "transparent",
          border: "none",
          color: "#4a4540",
          cursor: "pointer",
          fontSize: "26px",
          lineHeight: 1,
          fontFamily: "Georgia, serif",
          transition: "color 0.15s ease",
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

      <div className="welcome-inner">
        {/* Eyebrow */}
        <p
          style={{
            fontFamily: DISPLAY,
            fontSize: "13px",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "#8a6c28",
            textAlign: "center",
            margin: "0 0 18px",
          }}
        >
          An AI Reading Companion
        </p>

        {/* Title */}
        <h1
          style={{
            fontFamily: DISPLAY,
            fontSize: "clamp(40px, 8vw, 60px)",
            fontWeight: 600,
            lineHeight: 1.05,
            color: "#f0ebe2",
            textAlign: "center",
            letterSpacing: "-0.01em",
            margin: "0 0 6px",
          }}
        >
          Paradise Lost
        </h1>
        <p
          style={{
            fontFamily: DISPLAY,
            fontSize: "22px",
            fontStyle: "italic",
            color: "#c9a84c",
            textAlign: "center",
            margin: 0,
          }}
        >
          Book I
        </p>

        {rule}

        {/* The why */}
        <p
          style={{
            fontFamily: BODY,
            fontSize: "17px",
            lineHeight: 1.75,
            color: "#d4cfc6",
            textAlign: "center",
            margin: "0 auto",
            maxWidth: "500px",
          }}
        >
          Milton wrote for readers who already knew their Bible, their Homer, and
          the politics of 1667. You don&rsquo;t need to. This companion restores
          what those first readers knew — so the poem opens up instead of shutting
          you out.
        </p>

        {/* Features */}
        <div style={{ margin: "34px 0 6px" }}>
          {FEATURES.map((f) => (
            <div
              key={f.name}
              style={{
                display: "flex",
                gap: "14px",
                alignItems: "flex-start",
                marginBottom: "18px",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  color: "#c9a84c",
                  fontSize: "16px",
                  lineHeight: 1.5,
                  flexShrink: 0,
                }}
              >
                ✦
              </span>
              <p style={{ margin: 0 }}>
                <span
                  style={{
                    fontFamily: DISPLAY,
                    fontSize: "20px",
                    color: "#f0ebe2",
                    marginRight: "10px",
                  }}
                >
                  {f.name}
                </span>
                <span
                  style={{
                    fontFamily: BODY,
                    fontSize: "15px",
                    lineHeight: 1.65,
                    color: "#8a847a",
                  }}
                >
                  {f.blurb}
                </span>
              </p>
            </div>
          ))}
        </div>

        {/* No-spoilers ethos */}
        <p
          style={{
            fontFamily: BODY,
            fontSize: "15px",
            fontStyle: "italic",
            color: "#8a6c28",
            textAlign: "center",
            margin: "0",
          }}
        >
          It never summarizes and never spoils. It only enriches.
        </p>

        {rule}

        {/* Level picker */}
        <p
          style={{
            fontFamily: DISPLAY,
            fontSize: "20px",
            color: "#d4cfc6",
            textAlign: "center",
            margin: "0 0 4px",
          }}
        >
          First — how much do you already know?
        </p>
        <p
          style={{
            fontFamily: BODY,
            fontSize: "14px",
            color: "#8a847a",
            textAlign: "center",
            margin: "0 0 20px",
          }}
        >
          This calibrates every explanation to you. You can change it anytime.
        </p>

        <div className="welcome-levels">
          {KNOWLEDGE_LEVELS.map((lvl) => {
            const active = selected === lvl;
            return (
              <button
                key={lvl}
                onClick={() => setSelected(lvl)}
                style={{
                  background: active ? "#1c1b18" : "transparent",
                  border: `1px solid ${active ? "#c9a84c" : "#2a2820"}`,
                  borderRadius: "4px",
                  padding: "12px 14px",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  if (!active)
                    (e.currentTarget as HTMLButtonElement).style.borderColor =
                      "#4a4540";
                }}
                onMouseLeave={(e) => {
                  if (!active)
                    (e.currentTarget as HTMLButtonElement).style.borderColor =
                      "#2a2820";
                }}
              >
                <div
                  style={{
                    fontFamily: DISPLAY,
                    fontSize: "17px",
                    fontWeight: 600,
                    color: active ? "#c9a84c" : "#d4cfc6",
                    marginBottom: "3px",
                  }}
                >
                  {KNOWLEDGE_LEVEL_LABELS[lvl]}
                </div>
                <div
                  style={{
                    fontFamily: BODY,
                    fontSize: "12px",
                    lineHeight: 1.45,
                    color: active ? "#8a847a" : "#4a4540",
                  }}
                >
                  {KNOWLEDGE_LEVEL_DESCRIPTIONS[lvl]}
                </div>
              </button>
            );
          })}
        </div>

        {/* Begin */}
        <div style={{ textAlign: "center", margin: "30px 0 8px" }}>
          <button
            onClick={() => onBegin(selected)}
            style={{
              background: "#c9a84c",
              border: "none",
              borderRadius: "4px",
              padding: "13px 34px",
              cursor: "pointer",
              color: "#0d0d0e",
              fontFamily: DISPLAY,
              fontSize: "18px",
              fontWeight: 600,
              letterSpacing: "0.04em",
              transition: "background 0.15s ease",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.background =
                "#d8b95c")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.background =
                "#c9a84c")
            }
          >
            Begin reading →
          </button>
        </div>
      </div>
    </div>
  );
}
