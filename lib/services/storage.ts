import type { ExamResult } from "@/lib/core/grading";
import type { ExamSession } from "@/lib/core/session";

const SESSION_KEY = "aiceCbt:activeSession";
const RESULT_KEY = "aiceCbt:lastResult";
const WRONG_NOTE_KEY = "aiceCbt:wrongNotes";

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 저장 공간 차단 시에도 현재 시험은 메모리에서 계속 진행됩니다.
  }
}

export function loadSession(): ExamSession | null {
  return readJson<ExamSession>(SESSION_KEY);
}

export function saveSession(session: ExamSession): void {
  writeJson(SESSION_KEY, session);
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
}

export function getResult(): ExamResult | null {
  return readJson<ExamResult>(RESULT_KEY);
}

export function saveResult(result: ExamResult): void {
  writeJson(RESULT_KEY, result);
}

export function getWrongNoteIds(): string[] {
  return readJson<string[]>(WRONG_NOTE_KEY) ?? [];
}

export function saveWrongNotes(result: ExamResult): void {
  const saved = new Set(getWrongNoteIds());
  result.details.forEach(({ question, isCorrect }) => {
    if (isCorrect) saved.delete(question.id);
    else saved.add(question.id);
  });
  writeJson(WRONG_NOTE_KEY, [...saved]);
}
