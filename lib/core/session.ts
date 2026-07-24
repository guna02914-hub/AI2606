import type { ExamMode } from "@/lib/core/grading";
import type { Question } from "@/lib/data/questions";

export type ExamSession = {
  id: string;
  mode: ExamMode;
  questionIds: string[];
  answers: Record<string, number>;
  index: number;
  startedAt: number;
  durationMinutes: number | null;
  submitted: boolean;
};

export function createSession({
  mode,
  items,
  durationMinutes = null,
}: {
  mode: ExamMode;
  items: Question[];
  durationMinutes?: number | null;
}): ExamSession {
  return {
    id:
      globalThis.crypto?.randomUUID?.() ??
      `session-${Date.now().toString(36)}`,
    mode,
    questionIds: items.map(({ id }) => id),
    answers: {},
    index: 0,
    startedAt: Date.now(),
    durationMinutes,
    submitted: false,
  };
}

export function sessionIsUsable(
  session: ExamSession | null,
  allQuestions: Question[],
): session is ExamSession {
  if (
    !session ||
    session.submitted ||
    !Array.isArray(session.questionIds) ||
    session.questionIds.length === 0 ||
    !Number.isInteger(session.index) ||
    session.index < 0 ||
    session.index >= session.questionIds.length
  ) {
    return false;
  }

  const knownIds = new Set(allQuestions.map(({ id }) => id));
  return session.questionIds.every((id) => knownIds.has(id));
}

export function elapsedSeconds(
  session: ExamSession,
  now = Date.now(),
): number {
  return Math.max(0, Math.floor((now - session.startedAt) / 1000));
}

export function remainingSeconds(
  session: ExamSession,
  now = Date.now(),
): number | null {
  if (session.durationMinutes === null) return null;
  return Math.max(
    0,
    session.durationMinutes * 60 - elapsedSeconds(session, now),
  );
}
