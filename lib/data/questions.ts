export type Difficulty = "easy" | "medium" | "hard";

export type Question = {
  id: string;
  subject: string;
  difficulty: Difficulty;
  question: string;
  choices: string[];
  answer: number;
  explanation: string;
};

// 공식 기출문제가 아닌 학습 흐름 확인용 자체 제작 예시 문항입니다.
export const questions: Question[] = [
  {
    id: "basic-001",
    subject: "AI 기초",
    difficulty: "easy",
    question: "인공지능을 활용한 서비스의 예로 가장 알맞은 것은?",
    choices: [
      "온도계로 실내 온도 측정",
      "음성 명령을 분석해 음악 추천",
      "종이 달력에 일정 작성",
      "스위치로 손전등 켜기",
    ],
    answer: 1,
    explanation:
      "음성 인식과 추천은 데이터를 바탕으로 입력을 분석하고 결과를 제시하는 AI 활용 사례입니다.",
  },
  {
    id: "basic-002",
    subject: "데이터 이해",
    difficulty: "easy",
    question: "데이터를 분석하기 전에 가장 먼저 확인할 내용으로 알맞은 것은?",
    choices: [
      "그래프 색상",
      "데이터의 목적과 수집 기준",
      "결과 발표 디자인",
      "사용할 모델의 이름",
    ],
    answer: 1,
    explanation:
      "분석 목적과 데이터의 수집 기준을 먼저 확인해야 결과를 올바르게 해석할 수 있습니다.",
  },
  {
    id: "basic-003",
    subject: "AI 윤리",
    difficulty: "medium",
    question: "AI가 만든 결과를 사용할 때 가장 적절한 태도는?",
    choices: [
      "항상 정답이라고 믿는다",
      "출처와 오류 가능성을 확인한다",
      "개인정보를 자유롭게 입력한다",
      "검토 없이 바로 공유한다",
    ],
    answer: 1,
    explanation:
      "AI 결과에는 오류나 편향이 있을 수 있으므로 출처와 사실 여부를 검토해야 합니다.",
  },
  {
    id: "basic-004",
    subject: "AI 기초",
    difficulty: "medium",
    question: "기계학습 모델을 학습시키는 데이터의 역할로 가장 알맞은 것은?",
    choices: [
      "화면의 색상을 정한다",
      "모델이 규칙과 패턴을 찾을 근거를 제공한다",
      "인터넷 속도를 높인다",
      "파일 크기를 항상 줄인다",
    ],
    answer: 1,
    explanation:
      "학습 데이터는 모델이 입력과 결과 사이의 패턴을 찾는 데 사용하는 근거입니다.",
  },
  {
    id: "basic-005",
    subject: "데이터 이해",
    difficulty: "hard",
    question: "누락된 값이 많은 데이터로 분석을 진행하기 전 가장 적절한 행동은?",
    choices: [
      "누락 여부를 무시한다",
      "모든 값을 임의의 숫자로 바꾼다",
      "누락 원인과 비율을 확인한 뒤 처리 기준을 정한다",
      "결과가 좋을 때까지 데이터를 반복 삭제한다",
    ],
    answer: 2,
    explanation:
      "누락값의 원인과 규모를 먼저 확인하고, 분석 목적에 맞는 제거·대체 기준을 정해야 합니다.",
  },
  {
    id: "basic-006",
    subject: "AI 윤리",
    difficulty: "hard",
    question: "개인정보가 포함된 자료를 AI 도구에 입력하려 할 때 우선할 행동은?",
    choices: [
      "원본을 그대로 입력한다",
      "공개 게시판에 먼저 공유한다",
      "개인정보를 제거하고 사용 규정을 확인한다",
      "파일 이름만 변경한다",
    ],
    answer: 2,
    explanation:
      "개인정보를 비식별화하고 소속 기관과 서비스의 데이터 사용 규정을 확인해야 합니다.",
  },
];

export const mockExam = {
  id: "basic-mock-01",
  title: "AICE Basic 미니 모의고사",
  durationMinutes: 10,
};

export const difficultyLabel: Record<Difficulty, string> = {
  easy: "기초",
  medium: "중급",
  hard: "고급",
};
