"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type ExamMode,
  type ExamResult,
  gradeExam,
  validateQuestions,
} from "@/lib/core/grading";
import {
  type ExamSession,
  createSession,
  elapsedSeconds,
  remainingSeconds,
  sessionIsUsable,
} from "@/lib/core/session";
import {
  difficultyLabel,
  mockExam,
  questions,
  type Difficulty,
  type Question,
} from "@/lib/data/questions";
import {
  clearSession,
  getResult,
  getWrongNoteIds,
  loadSession,
  saveResult,
  saveSession,
  saveWrongNotes,
} from "@/lib/services/storage";

type Screen = "home" | "select" | "solve" | "result" | "wrong";
type SelectMode = Exclude<ExamMode, "retry">;

const choiceLabels = ["①", "②", "③", "④", "⑤"];

function formatTime(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(
    seconds % 60,
  ).padStart(2, "0")}`;
}

function setLocationHash(screen: Screen) {
  const hash =
    screen === "result"
      ? "#result"
      : screen === "wrong"
        ? "#wrong-notes"
        : "";
  window.history.replaceState(null, "", `${window.location.pathname}${hash}`);
}

export function CbtApp() {
  const [screen, setScreenState] = useState<Screen>("home");
  const [session, setSession] = useState<ExamSession | null>(null);
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [resumable, setResumable] = useState(false);
  const [wrongIds, setWrongIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [now, setNow] = useState(0);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const submittingRef = useRef(false);

  const dataError = validateQuestions(questions);

  const setScreen = useCallback((next: Screen) => {
    setScreenState(next);
    setLocationHash(next);
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const storedSession = loadSession();
      const usable = sessionIsUsable(storedSession, questions);
      const storedResult = getResult();
      const storedWrongIds = getWrongNoteIds().filter((id) =>
        questions.some((question) => question.id === id),
      );

      setResumable(usable);
      setWrongIds(storedWrongIds);
      setResult(storedResult);
      setNow(Date.now());

      if (window.location.hash === "#result") {
        setScreenState(storedResult ? "result" : "select");
        if (!storedResult) {
          setNotice("확인할 제출 결과가 없어 학습 선택 화면으로 이동했습니다.");
          setLocationHash("select");
        }
      } else if (window.location.hash === "#wrong-notes") {
        setScreenState("wrong");
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (screen !== "solve" || !session) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [screen, session]);

  const finishExam = useCallback(() => {
    if (!session || activeQuestions.length === 0 || submittingRef.current) return;
    submittingRef.current = true;
    const nextResult = gradeExam(
      activeQuestions,
      session.answers,
      session.mode,
    );
    saveResult(nextResult);
    saveWrongNotes(nextResult);
    clearSession();
    setResult(nextResult);
    setWrongIds(getWrongNoteIds());
    setSession(null);
    setResumable(false);
    setSubmitOpen(false);
    setScreen("result");
    window.setTimeout(() => {
      submittingRef.current = false;
    }, 0);
  }, [activeQuestions, session, setScreen]);

  const remaining =
    session?.mode === "mock" ? remainingSeconds(session, now) : null;

  useEffect(() => {
    if (
      screen === "solve" &&
      session?.mode === "mock" &&
      remaining === 0
    ) {
      finishExam();
    }
  }, [finishExam, remaining, screen, session?.mode]);

  const goHome = () => {
    setResumable(sessionIsUsable(loadSession(), questions));
    setWrongIds(getWrongNoteIds());
    setScreen("home");
  };

  const resumeExam = () => {
    const stored = loadSession();
    if (!sessionIsUsable(stored, questions)) {
      clearSession();
      setResumable(false);
      setNotice("이어 풀 수 있는 학습 기록이 없습니다.");
      setScreen("select");
      return;
    }
    const items = stored.questionIds
      .map((id) => questions.find((question) => question.id === id))
      .filter((item): item is Question => Boolean(item));
    setSession(stored);
    setActiveQuestions(items);
    setNow(Date.now());
    setScreen("solve");
  };

  const startExam = (
    mode: SelectMode,
    subject: string,
    difficulty: string,
    count: number,
  ) => {
    const items =
      mode === "mock"
        ? [...questions]
        : questions
            .filter(
              (question) =>
                (subject === "all" || question.subject === subject) &&
                (difficulty === "all" ||
                  question.difficulty === difficulty),
            )
            .slice(0, count);

    if (items.length === 0) {
      setNotice("선택 조건에 맞는 문제가 없습니다. 조건을 바꿔 주세요.");
      return;
    }

    clearSession();
    const nextSession = createSession({
      mode,
      items,
      durationMinutes:
        mode === "mock" ? mockExam.durationMinutes : null,
    });
    saveSession(nextSession);
    setSession(nextSession);
    setActiveQuestions(items);
    setResumable(true);
    setNow(Date.now());
    setScreen("solve");
  };

  const updateSession = (next: ExamSession) => {
    setSession(next);
    saveSession(next);
  };

  const retryQuestion = (question: Question) => {
    const nextSession = createSession({
      mode: "retry",
      items: [question],
    });
    saveSession(nextSession);
    setSession(nextSession);
    setActiveQuestions([question]);
    setNow(Date.now());
    setScreen("solve");
  };

  if (!hydrated) {
    return (
      <main className="app-shell">
        <section className="panel loading-card" aria-live="polite">
          학습 화면을 준비하고 있습니다.
        </section>
      </main>
    );
  }

  if (dataError) {
    return (
      <main className="app-shell">
        <section className="panel error-card">
          <span className="status-icon" aria-hidden="true">
            !
          </span>
          <p className="eyebrow">DATA ERROR</p>
          <h1>문제를 불러오지 못했습니다</h1>
          <p>{dataError}</p>
          <button type="button" onClick={() => window.location.reload()}>
            다시 불러오기
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="site-header">
        <button type="button" className="brand" onClick={goHome}>
          <span className="brand-mark" aria-hidden="true">
            A
          </span>
          <span>
            <strong>AICE CBT</strong>
            <small>Basic Practice</small>
          </span>
        </button>
        <nav aria-label="주요 메뉴">
          <button type="button" className="nav-link" onClick={() => setScreen("select")}>
            학습하기
          </button>
          <button type="button" className="nav-link" onClick={() => setScreen("wrong")}>
            오답노트
            {wrongIds.length > 0 && (
              <span className="nav-count">{wrongIds.length}</span>
            )}
          </button>
        </nav>
      </header>

      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}

      {screen === "home" && (
        <HomeScreen
          resumable={resumable}
          wrongCount={wrongIds.length}
          onStart={() => setScreen("select")}
          onResume={resumeExam}
          onWrong={() => setScreen("wrong")}
        />
      )}

      {screen === "select" && (
        <SelectScreen
          resumable={resumable}
          onHome={goHome}
          onResume={resumeExam}
          onStart={startExam}
        />
      )}

      {screen === "solve" && session && activeQuestions.length > 0 && (
        <SolveScreen
          session={session}
          items={activeQuestions}
          now={now}
          onUpdate={updateSession}
          onSubmit={() => setSubmitOpen(true)}
        />
      )}

      {screen === "result" && result && (
        <ResultScreen
          result={result}
          onWrong={() => setScreen("wrong")}
          onSelect={() => setScreen("select")}
          onHome={goHome}
        />
      )}

      {screen === "result" && !result && (
        <section className="panel empty-state">
          <h1>확인할 결과가 없습니다</h1>
          <p>문제를 제출하면 채점 결과와 해설을 확인할 수 있습니다.</p>
          <button type="button" onClick={() => setScreen("select")}>
            학습 선택으로 이동
          </button>
        </section>
      )}

      {screen === "wrong" && (
        <WrongNoteScreen
          ids={wrongIds}
          onHome={goHome}
          onRetry={retryQuestion}
        />
      )}

      {submitOpen && session && (
        <SubmitDialog
          items={activeQuestions}
          answers={session.answers}
          onCancel={() => setSubmitOpen(false)}
          onMove={(index) => {
            updateSession({ ...session, index });
            setSubmitOpen(false);
          }}
          onConfirm={finishExam}
        />
      )}
    </main>
  );
}

function HomeScreen({
  resumable,
  wrongCount,
  onStart,
  onResume,
  onWrong,
}: {
  resumable: boolean;
  wrongCount: number;
  onStart: () => void;
  onResume: () => void;
  onWrong: () => void;
}) {
  return (
    <section className="home-layout">
      <div className="hero-copy">
        <p className="eyebrow">AICE BASIC PRACTICE</p>
        <h1>
          한 문제씩 풀고,
          <br />
          결과로 바로 복습하세요.
        </h1>
        <p className="lead">
          과목과 난이도를 선택해 연습하거나 제한 시간이 있는 미니
          모의고사로 실전 흐름을 익힐 수 있습니다.
        </p>
        <div className="button-row">
          <button type="button" className="primary-button" onClick={onStart}>
            학습 시작
          </button>
          {resumable && (
            <button type="button" className="secondary-button" onClick={onResume}>
              이어 풀기
            </button>
          )}
        </div>
        <p className="sample-note">
          현재 문항은 사이트 기능 확인용 자체 제작 예시입니다.
        </p>
      </div>
      <aside className="dashboard-card" aria-label="학습 현황">
        <div className="dashboard-top">
          <span className="dashboard-label">오늘의 학습 준비</span>
          <span className="ready-dot">준비 완료</span>
        </div>
        <div className="metric-grid">
          <div>
            <strong>{questions.length}</strong>
            <span>연습 문항</span>
          </div>
          <div>
            <strong>3</strong>
            <span>학습 과목</span>
          </div>
          <div>
            <strong>{wrongCount}</strong>
            <span>복습할 문제</span>
          </div>
        </div>
        <div className="mini-flow" aria-label="학습 순서">
          <div><span>1</span><p><strong>조건 선택</strong><small>과목·난이도</small></p></div>
          <div><span>2</span><p><strong>문제 풀이</strong><small>자동 저장</small></p></div>
          <div><span>3</span><p><strong>결과 복습</strong><small>해설·오답노트</small></p></div>
        </div>
        <button type="button" className="text-link" onClick={onWrong}>
          오답노트 바로가기 <span aria-hidden="true">→</span>
        </button>
      </aside>
    </section>
  );
}

function SelectScreen({
  resumable,
  onHome,
  onResume,
  onStart,
}: {
  resumable: boolean;
  onHome: () => void;
  onResume: () => void;
  onStart: (
    mode: SelectMode,
    subject: string,
    difficulty: string,
    count: number,
  ) => void;
}) {
  const subjects = [...new Set(questions.map(({ subject }) => subject))];
  const [mode, setMode] = useState<SelectMode>("learning");
  const [subject, setSubject] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [count, setCount] = useState(questions.length);

  const matches = useMemo(
    () =>
      questions.filter(
        (question) =>
          (subject === "all" || question.subject === subject) &&
          (difficulty === "all" || question.difficulty === difficulty),
      ),
    [difficulty, subject],
  );

  const selectedCount = Math.min(count, matches.length);

  const selectedSubject =
    subject === "all" ? "전체 과목" : subject;
  const selectedDifficulty =
    difficulty === "all"
      ? "전체 난이도"
      : difficultyLabel[difficulty as Difficulty];

  return (
    <section className="panel select-panel">
      <button type="button" className="back-button" onClick={onHome}>
        <span aria-hidden="true">←</span> 홈
      </button>
      <div className="section-heading">
        <p className="eyebrow">STEP 1</p>
        <h1>학습 방식을 선택하세요</h1>
        <p>시작 전 선택한 조건과 문항 수를 한 번 더 확인할 수 있습니다.</p>
      </div>

      {resumable && (
        <div className="resume-banner">
          <div>
            <strong>진행 중인 학습이 저장되어 있습니다.</strong>
            <p>이어 풀거나 아래에서 새 학습 조건을 선택하세요.</p>
          </div>
          <button type="button" className="secondary-button" onClick={onResume}>
            이어 풀기
          </button>
        </div>
      )}

      <div className="mode-grid">
        <button
          type="button"
          className={`mode-card ${mode === "learning" ? "selected" : ""}`}
          aria-pressed={mode === "learning"}
          onClick={() => setMode("learning")}
        >
          <span className="mode-icon" aria-hidden="true">✓</span>
          <strong>학습 모드</strong>
          <small>과목·난이도·문항 수를 직접 선택합니다.</small>
          <em>시간 제한 없음</em>
        </button>
        <button
          type="button"
          className={`mode-card ${mode === "mock" ? "selected" : ""}`}
          aria-pressed={mode === "mock"}
          onClick={() => setMode("mock")}
        >
          <span className="mode-icon" aria-hidden="true">◷</span>
          <strong>모의고사 모드</strong>
          <small>전체 문제를 제한 시간 안에 풉니다.</small>
          <em>{mockExam.durationMinutes}분 제한</em>
        </button>
      </div>

      {mode === "learning" ? (
        <div className="filter-grid">
          <label>
            과목
            <select value={subject} onChange={(event) => setSubject(event.target.value)}>
              <option value="all">전체 과목</option>
              {subjects.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            난이도
            <select
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value)}
            >
              <option value="all">전체 난이도</option>
              <option value="easy">기초</option>
              <option value="medium">중급</option>
              <option value="hard">고급</option>
            </select>
          </label>
          <label>
            문항 수
            <select
              value={selectedCount}
              disabled={matches.length === 0}
              onChange={(event) => setCount(Number(event.target.value))}
            >
              {matches.length === 0 ? (
                <option value={0}>0문항</option>
              ) : (
                <option value={matches.length}>전체 ({matches.length}문항)</option>
              )}
              {[2, 5, 10, 20]
                .filter((value) => value < matches.length)
                .map((value) => (
                  <option key={value} value={value}>{value}문항</option>
                ))}
            </select>
          </label>
        </div>
      ) : (
        <div className="mock-summary">
          <span className="mode-icon" aria-hidden="true">◷</span>
          <div>
            <strong>{mockExam.title}</strong>
            <p>전체 {questions.length}문항 · {mockExam.durationMinutes}분 · 시간 종료 시 자동 제출</p>
          </div>
        </div>
      )}

      <div className="start-summary">
        <div>
          <span>선택 내용</span>
          <strong>
            {mode === "mock"
              ? `${mockExam.title} · ${questions.length}문항`
              : `${selectedSubject} · ${selectedDifficulty} · ${selectedCount}문항`}
          </strong>
        </div>
        <button
          type="button"
          className="primary-button"
          disabled={mode === "learning" && matches.length === 0}
          onClick={() => onStart(mode, subject, difficulty, selectedCount)}
        >
          {mode === "mock" ? "모의고사 시작" : "학습 시작"}
        </button>
      </div>
      {mode === "learning" && matches.length === 0 && (
        <p className="inline-error" role="alert">
          선택 조건에 맞는 문제가 없습니다. 과목이나 난이도를 바꿔 주세요.
        </p>
      )}
    </section>
  );
}

function SolveScreen({
  session,
  items,
  now,
  onUpdate,
  onSubmit,
}: {
  session: ExamSession;
  items: Question[];
  now: number;
  onUpdate: (session: ExamSession) => void;
  onSubmit: () => void;
}) {
  const question = items[session.index];
  const answeredCount = items.filter(({ id }) =>
    Number.isInteger(session.answers[id]),
  ).length;
  const seconds =
    session.mode === "mock"
      ? (remainingSeconds(session, now) ?? 0)
      : elapsedSeconds(session, now);

  const selectChoice = (choice: number) => {
    const answers = { ...session.answers };
    if (answers[question.id] === choice) delete answers[question.id];
    else answers[question.id] = choice;
    onUpdate({ ...session, answers });
  };

  return (
    <section className="panel solve-panel">
      <div className="solve-header">
        <div>
          <p className="eyebrow">
            {session.mode === "mock"
              ? "모의고사"
              : session.mode === "retry"
                ? "오답 재풀이"
                : "학습 모드"}
          </p>
          <span className="subject-badge">
            {question.subject} · {difficultyLabel[question.difficulty]}
          </span>
        </div>
        <div className="timer" aria-live="off">
          <span>{session.mode === "mock" ? "남은 시간" : "풀이 시간"}</span>
          <strong>{formatTime(seconds)}</strong>
        </div>
      </div>

      <div className="progress-copy">
        <strong>{session.index + 1} / {items.length}번</strong>
        <span>응답 {answeredCount} · 미응답 {items.length - answeredCount}</span>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-label="문제 풀이 진행률"
        aria-valuemin={0}
        aria-valuemax={items.length}
        aria-valuenow={session.index + 1}
      >
        <span style={{ width: `${((session.index + 1) / items.length) * 100}%` }} />
      </div>

      <div className="question-area">
        <h1>
          <span>Q{session.index + 1}.</span> {question.question}
        </h1>
        <div className="choices" role="group" aria-label={`${session.index + 1}번 문제 보기`}>
          {question.choices.map((choice, index) => {
            const selected = session.answers[question.id] === index;
            return (
              <button
                type="button"
                key={choice}
                className={`choice ${selected ? "selected" : ""}`}
                aria-pressed={selected}
                onClick={() => selectChoice(index)}
              >
                <span aria-hidden="true">{choiceLabels[index] ?? `${index + 1}.`}</span>
                <strong>{choice}</strong>
                {selected && <em>선택됨</em>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="question-navigation">
        <div className="nav-legend" aria-hidden="true">
          <span><i className="legend-dot current" />현재</span>
          <span><i className="legend-dot answered" />응답</span>
          <span><i className="legend-dot" />미응답</span>
        </div>
        <div className="number-list" aria-label="문항 바로 이동">
          {items.map((item, index) => {
            const answered = Number.isInteger(session.answers[item.id]);
            const current = index === session.index;
            return (
              <button
                type="button"
                key={item.id}
                className={`${current ? "current" : ""} ${answered ? "answered" : ""}`}
                aria-label={`${index + 1}번 ${answered ? "응답 완료" : "미응답"}${current ? ", 현재 문제" : ""}`}
                aria-current={current ? "step" : undefined}
                onClick={() => onUpdate({ ...session, index })}
              >
                {index + 1}
                {answered && <span aria-hidden="true">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bottom-actions" aria-label="문제 이동 및 제출">
        <button
          type="button"
          className="secondary-button"
          disabled={session.index === 0}
          onClick={() => onUpdate({ ...session, index: session.index - 1 })}
        >
          이전
        </button>
        <button
          type="button"
          className="secondary-button"
          disabled={session.index === items.length - 1}
          onClick={() => onUpdate({ ...session, index: session.index + 1 })}
        >
          다음
        </button>
        <button type="button" className="primary-button" onClick={onSubmit}>
          제출하기
        </button>
      </div>
    </section>
  );
}

function SubmitDialog({
  items,
  answers,
  onCancel,
  onMove,
  onConfirm,
}: {
  items: Question[];
  answers: Record<string, number>;
  onCancel: () => void;
  onMove: (index: number) => void;
  onConfirm: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const unanswered = items
    .map((question, index) =>
      Number.isInteger(answers[question.id]) ? null : index,
    )
    .filter((index): index is number => index !== null);

  useEffect(() => {
    cancelRef.current?.focus();
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onCancel]);

  return (
    <div className="modal-backdrop" onMouseDown={onCancel}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="submit-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <span className="modal-icon" aria-hidden="true">✓</span>
        <h2 id="submit-title">답안을 제출할까요?</h2>
        <p>
          {unanswered.length > 0
            ? `미응답 ${unanswered.length}문항이 있습니다. 제출 후에는 답안을 수정할 수 없습니다.`
            : "모든 문항에 답했습니다. 제출 후에는 답안을 수정할 수 없습니다."}
        </p>
        {unanswered.length > 0 && (
          <div className="unanswered-list">
            <strong>미응답 문항으로 이동</strong>
            <div>
              {unanswered.map((index) => (
                <button type="button" key={index} onClick={() => onMove(index)}>
                  {index + 1}번
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="modal-actions">
          <button
            type="button"
            ref={cancelRef}
            className="secondary-button"
            onClick={onCancel}
          >
            계속 풀기
          </button>
          <button type="button" className="primary-button" onClick={onConfirm}>
            그대로 제출
          </button>
        </div>
      </section>
    </div>
  );
}

function ResultScreen({
  result,
  onWrong,
  onSelect,
  onHome,
}: {
  result: ExamResult;
  onWrong: () => void;
  onSelect: () => void;
  onHome: () => void;
}) {
  return (
    <section className="panel result-panel">
      <button type="button" className="back-button" onClick={onHome}>
        <span aria-hidden="true">←</span> 홈
      </button>
      <div className="result-hero">
        <div className="score-ring" aria-label={`점수 ${result.score}점`}>
          <strong>{result.score}</strong>
          <span>점</span>
        </div>
        <div>
          <p className="eyebrow">RESULT</p>
          <h1>채점이 완료되었습니다</h1>
          <p>문항별 답과 해설을 확인하고 오답을 다시 풀어 보세요.</p>
        </div>
      </div>
      <div className="result-metrics">
        <div><strong>{result.correctCount}</strong><span>정답</span></div>
        <div><strong>{result.wrongCount}</strong><span>오답</span></div>
        <div><strong>{result.unansweredCount}</strong><span>미응답</span></div>
        <div><strong>{result.details.length}</strong><span>전체</span></div>
      </div>
      <div className="result-actions">
        <button type="button" className="primary-button" onClick={onWrong}>
          오답노트 보기
        </button>
        <button type="button" className="secondary-button" onClick={onSelect}>
          다른 문제 풀기
        </button>
      </div>
      <div className="explanation-list">
        <h2>문항별 해설</h2>
        {result.details.map(({ question, selected, isCorrect, isAnswered }, index) => (
          <article className="explanation-card" key={question.id}>
            <div className="explanation-heading">
              <strong>Q{index + 1}. {question.question}</strong>
              <span className={isCorrect ? "state-correct" : "state-wrong"}>
                {isCorrect ? "정답" : isAnswered ? "오답" : "미응답"}
              </span>
            </div>
            <dl>
              <div>
                <dt>내 답</dt>
                <dd>{isAnswered ? question.choices[selected as number] : "미응답"}</dd>
              </div>
              <div>
                <dt>정답</dt>
                <dd>{question.choices[question.answer]}</dd>
              </div>
            </dl>
            <p className="answer-note"><strong>해설</strong>{question.explanation}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function WrongNoteScreen({
  ids,
  onHome,
  onRetry,
}: {
  ids: string[];
  onHome: () => void;
  onRetry: (question: Question) => void;
}) {
  const [openIds, setOpenIds] = useState<string[]>([]);
  const items = questions.filter((question) => ids.includes(question.id));

  return (
    <section className="panel wrong-panel">
      <button type="button" className="back-button" onClick={onHome}>
        <span aria-hidden="true">←</span> 홈
      </button>
      <div className="section-heading">
        <p className="eyebrow">REVIEW</p>
        <h1>오답노트</h1>
        <p>틀렸거나 답하지 않은 문제를 다시 확인합니다.</p>
      </div>
      {items.length === 0 ? (
        <div className="empty-state">
          <span aria-hidden="true">✓</span>
          <h2>저장된 오답이 없습니다</h2>
          <p>문제를 풀고 제출하면 오답과 미응답 문항이 자동으로 모입니다.</p>
        </div>
      ) : (
        <div className="wrong-list">
          {items.map((question, index) => {
            const open = openIds.includes(question.id);
            return (
              <article className="wrong-card" key={question.id}>
                <div className="wrong-meta">
                  <span>오답 {index + 1}</span>
                  <small>{question.subject} · {difficultyLabel[question.difficulty]}</small>
                </div>
                <h2>{question.question}</h2>
                <div className="wrong-actions">
                  <button type="button" className="primary-button" onClick={() => onRetry(question)}>
                    다시 풀기
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    aria-expanded={open}
                    onClick={() =>
                      setOpenIds(
                        open
                          ? openIds.filter((id) => id !== question.id)
                          : [...openIds, question.id],
                      )
                    }
                  >
                    {open ? "해설 닫기" : "해설 보기"}
                  </button>
                </div>
                {open && (
                  <div className="wrong-explanation">
                    <strong>정답: {question.choices[question.answer]}</strong>
                    <p>{question.explanation}</p>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
