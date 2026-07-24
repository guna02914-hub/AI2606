import type { Question } from "@/lib/data/questions";

export type GradedDetail = {
  question: Question;
  selected?: number;
  isAnswered: boolean;
  isCorrect: boolean;
};

export type ExamResult = {
  details: GradedDetail[];
  correctCount: number;
  answeredCount: number;
  unansweredCount: number;
  wrongCount: number;
  score: number;
  completedAt: number;
  mode: ExamMode;
};

export type ExamMode = "learning" | "mock" | "retry";

export function validateQuestions(items: Question[]): string | null {
  if (!Array.isArray(items) || items.length === 0) {
    return "출제된 문제가 없습니다.";
  }

  const ids = new Set<string>();
  for (const item of items) {
    const invalid =
      !item.id ||
      ids.has(item.id) ||
      !item.subject ||
      !item.question ||
      !item.explanation ||
      !Array.isArray(item.choices) ||
      item.choices.length < 2 ||
      !Number.isInteger(item.answer) ||
      item.answer < 0 ||
      item.answer >= item.choices.length;

    if (invalid) return "문제 데이터 형식이 올바르지 않습니다.";
    ids.add(item.id);
  }

  return null;
}

export function gradeExam(
  items: Question[],
  answers: Record<string, number>,
  mode: ExamMode,
): ExamResult {
  const details = items.map((question) => {
    const selected = answers[question.id];
    const isAnswered = Number.isInteger(selected);
    return {
      question,
      selected,
      isAnswered,
      isCorrect: isAnswered && selected === question.answer,
    };
  });

  const correctCount = details.filter((item) => item.isCorrect).length;
  const answeredCount = details.filter((item) => item.isAnswered).length;
  const unansweredCount = items.length - answeredCount;

  return {
    details,
    correctCount,
    answeredCount,
    unansweredCount,
    wrongCount: answeredCount - correctCount,
    score: items.length
      ? Math.round((correctCount / items.length) * 100)
      : 0,
    completedAt: Date.now(),
    mode,
  };
}
