"use client";

import {
  KnowledgeLevel,
  KNOWLEDGE_LEVELS,
  KNOWLEDGE_LEVEL_LABELS,
  KNOWLEDGE_LEVEL_DESCRIPTIONS,
} from "@/lib/prompts";

interface KnowledgeToggleProps {
  value: KnowledgeLevel;
  onChange: (level: KnowledgeLevel) => void;
}

export default function KnowledgeToggle({
  value,
  onChange,
}: KnowledgeToggleProps) {
  return (
    <div
      style={{
        borderTop: "1px solid #2a2820",
        borderBottom: "1px solid #2a2820",
        padding: "20px 0 24px",
        marginBottom: "48px",
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-cormorant), Georgia, serif",
          fontSize: "24px",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: "#8a847a",
          marginBottom: "14px",
          margin: "0 0 14px",
        }}
      >
        Your Reading Level
      </p>

      {/* Desktop: horizontal grid of tabs */}
      {/* display comes from the .hidden-mobile class so the mobile media query can hide it */}
      <div
        style={{
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "8px",
        }}
        className="hidden-mobile"
      >
        {KNOWLEDGE_LEVELS.map((lvl) => {
          const active = value === lvl;
          return (
            <button
              key={lvl}
              onClick={() => onChange(lvl)}
              style={{
                background: active ? "#1c1b18" : "transparent",
                border: `1px solid ${active ? "#c9a84c" : "#2a2820"}`,
                borderRadius: "4px",
                padding: "12px 16px",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s ease",
                color: active ? "#f0ebe2" : "#8a847a",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    "#4a4540";
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "#c0bbb3";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    "#2a2820";
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "#8a847a";
                }
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-cormorant), Georgia, serif",
                  fontSize: "16px",
                  fontWeight: 600,
                  lineHeight: 1.2,
                  marginBottom: "4px",
                  color: active ? "#c9a84c" : "inherit",
                }}
              >
                {KNOWLEDGE_LEVEL_LABELS[lvl]}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  lineHeight: 1.4,
                  color: active ? "#8a847a" : "#4a4540",
                }}
              >
                {KNOWLEDGE_LEVEL_DESCRIPTIONS[lvl]}
              </div>
            </button>
          );
        })}
      </div>

      {/* Mobile: select dropdown */}
      <div className="mobile-only">
        <div style={{ position: "relative" }}>
          <select
            value={value}
            onChange={(e) => onChange(e.target.value as KnowledgeLevel)}
            style={{
              width: "100%",
              background: "#1c1b18",
              border: "1px solid #c9a84c",
              borderRadius: "4px",
              padding: "12px 40px 12px 16px",
              color: "#f0ebe2",
              fontFamily: "var(--font-lora), Georgia, serif",
              fontSize: "15px",
              cursor: "pointer",
              appearance: "none",
              WebkitAppearance: "none",
            }}
          >
            {KNOWLEDGE_LEVELS.map((lvl) => (
              <option key={lvl} value={lvl}>
                {KNOWLEDGE_LEVEL_LABELS[lvl]}
              </option>
            ))}
          </select>
          <span
            style={{
              position: "absolute",
              right: "14px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#c9a84c",
              pointerEvents: "none",
              fontSize: "12px",
            }}
          >
            ▾
          </span>
        </div>
        <div
          style={{
            marginTop: "8px",
            fontSize: "13px",
            color: "#8a847a",
            fontStyle: "italic",
          }}
        >
          {KNOWLEDGE_LEVEL_DESCRIPTIONS[value]}
        </div>
      </div>
    </div>
  );
}
