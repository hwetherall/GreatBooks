"use client";

import { useState, useEffect, useCallback } from "react";
import { KnowledgeLevel, KNOWLEDGE_LEVELS } from "@/lib/prompts";
import type { Achievement } from "@/lib/types";
import KnowledgeToggle from "./KnowledgeToggle";
import Reader from "./Reader";
import AnnotationCard from "./AnnotationCard";
import Chat from "./Chat";
import ProgressBar from "./ProgressBar";
import AnnotationHistory from "./AnnotationHistory";
import AchievementToast from "./AchievementToast";
import FeedbackModal from "./FeedbackModal";
import WelcomeOverlay from "./WelcomeOverlay";

const STORAGE_KEY = "greatbooks-knowledge-level";
const FIRST_ENRICH_KEY = "greatbooks-first-enrichment";
const WELCOME_KEY = "greatbooks-welcome-seen";
const DEFAULT_LEVEL: KnowledgeLevel = "noob";

interface AnnotationState {
  passage: string;
  lineRange: string;
  lines: { start: number; end: number };
  anchorId?: string;
}

export default function ReadingContainer() {
  const [level, setLevel] = useState<KnowledgeLevel>(DEFAULT_LEVEL);
  const [annotation, setAnnotation] = useState<AnnotationState | null>(null);
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(null);
  const [annotationVersion, setAnnotationVersion] = useState(0);
  const [toastQueue, setToastQueue] = useState<Achievement[]>([]);
  const [chatPassage, setChatPassage] = useState<string | null>(null);
  const [showFirstHint, setShowFirstHint] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as KnowledgeLevel | null;
    if (stored && KNOWLEDGE_LEVELS.includes(stored)) {
      setLevel(stored);
    }
    if (!localStorage.getItem(FIRST_ENRICH_KEY)) {
      setShowFirstHint(true);
    }
    if (!localStorage.getItem(WELCOME_KEY)) {
      setShowWelcome(true);
    }
  }, []);

  function handleBeginReading(chosen: KnowledgeLevel) {
    setLevel(chosen);
    localStorage.setItem(STORAGE_KEY, chosen);
    localStorage.setItem(WELCOME_KEY, "seen");
    setShowWelcome(false);
  }

  useEffect(() => {
    fetch("/api/section-progress")
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: Array<{ section_id: string }>) => {
        setCompletedSections(new Set(rows.map((r) => r.section_id)));
      })
      .catch(() => {});
  }, []);

  function handleSectionComplete(sectionId: string, achievements: Achievement[] = []) {
    setCompletedSections((prev) => new Set([...prev, sectionId]));
    if (achievements.length > 0) {
      setToastQueue((prev) => [...prev, ...achievements]);
    }
  }

  const handleAnnotationComplete = useCallback((achievements: Achievement[]) => {
    setAnnotationVersion((v) => v + 1);
    if (achievements.length > 0) {
      setToastQueue((prev) => [...prev, ...achievements]);
    }
  }, []);

  const handleSectionVisible = useCallback((sectionId: string) => {
    setCurrentSectionId(sectionId);
  }, []);

  function dismissToast() {
    setToastQueue((prev) => prev.slice(1));
  }

  function handleLevelChange(newLevel: KnowledgeLevel) {
    setLevel(newLevel);
    localStorage.setItem(STORAGE_KEY, newLevel);
    setAnnotation(null); // close any open annotation when level changes
  }

  function handleAnnotateRequest(
    passage: string,
    lineRange: string,
    lines: { start: number; end: number },
    anchorId?: string
  ) {
    setAnnotation({ passage, lineRange, lines, anchorId });
    if (showFirstHint) {
      localStorage.setItem(FIRST_ENRICH_KEY, "done");
      setShowFirstHint(false);
    }
  }

  function handleAnnotationClose() {
    setAnnotation(null);
  }

  function handleChatRequest(passage: string) {
    setChatPassage(passage);
  }

  return (
    <>
      <button
        className="welcome-reopen"
        onClick={() => setShowWelcome(true)}
        aria-label="About this companion"
        title="About this companion"
      >
        ?
      </button>

      <ProgressBar
        completedSections={completedSections}
        currentSectionId={currentSectionId}
      />

      <KnowledgeToggle value={level} onChange={handleLevelChange} />

      <Reader
        level={level}
        activeLines={annotation?.lines ?? null}
        onAnnotateRequest={handleAnnotateRequest}
        onChatRequest={handleChatRequest}
        completedSections={completedSections}
        onSectionComplete={handleSectionComplete}
        onSectionVisible={handleSectionVisible}
        showFirstHint={showFirstHint}
      />

      {annotation && (
        <AnnotationCard
          key={`${annotation.passage}-${level}`}
          passage={annotation.passage}
          lineRange={annotation.lineRange}
          anchorId={annotation.anchorId}
          level={level}
          onClose={handleAnnotationClose}
          onComplete={handleAnnotationComplete}
        />
      )}

      <Chat
        level={level}
        pendingPassage={chatPassage}
        onPassageConsumed={() => setChatPassage(null)}
      />

      <AnnotationHistory annotationVersion={annotationVersion} />
      <FeedbackModal />

      {toastQueue.length > 0 && (
        <AchievementToast
          key={`${toastQueue[0].id}-${annotationVersion}`}
          achievement={toastQueue[0]}
          onDismiss={dismissToast}
        />
      )}

      {showWelcome && (
        <WelcomeOverlay
          initialLevel={level}
          onBegin={handleBeginReading}
          onClose={() => setShowWelcome(false)}
        />
      )}
    </>
  );
}
