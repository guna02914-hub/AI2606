# AICE CBT

AICE Basic 학습 흐름을 연습하기 위한 CBT 웹 애플리케이션입니다.

> 현재 문항은 사이트 기능 검증을 위해 자체 제작한 예시이며, 공식 기출문제가 아닙니다.

## 구현 기능

- 학습 모드: 과목·난이도·문항 수 선택
- 모의고사 모드: 제한 시간과 종료 시 자동 제출
- 답안 선택·해제, 이전·다음, 문항 번호 바로 이동
- 진행 중 답안과 현재 문항 자동 저장
- 새로고침·재접속 후 이어 풀기
- 미응답 문항 확인 및 해당 문항 이동
- 자동 채점, 점수·정답·오답·미응답 집계
- 문항별 정답과 해설
- 오답·미응답 누적 저장
- 오답 재풀이 후 정답이면 오답노트에서 제거
- PC·모바일 반응형 화면과 키보드 접근성

## 코드 구조

```text
aice-cbt-canvas/
├─ app/
│  ├─ globals.css              # 공통·반응형 화면 스타일
│  ├─ layout.tsx               # 문서 기본 정보
│  └─ page.tsx                 # 시작 화면
├─ components/
│  └─ cbt-app.tsx              # 화면과 사용자 동작 연결
├─ lib/
│  ├─ data/
│  │  └─ questions.ts          # 문제 데이터와 모의고사 설정
│  ├─ core/
│  │  ├─ grading.ts            # 데이터 검증·채점·점수 계산
│  │  └─ session.ts            # 시험 세션·시간 계산
│  └─ services/
│     └─ storage.ts            # 이어 풀기·결과·오답노트 저장
└─ tests/
   └─ rendered-html.test.mjs   # 배포 결과 기본 검사
```

## 문제 추가 방법

`lib/data/questions.ts`의 `questions` 배열에 다음 형식으로 문제를 추가합니다.

```ts
{
  id: "basic-007",
  subject: "AI 기초",
  difficulty: "easy",
  question: "문제 내용",
  choices: ["보기 1", "보기 2", "보기 3", "보기 4"],
  answer: 0,
  explanation: "정답 해설",
}
```

- `id`는 문제마다 중복되지 않아야 합니다.
- `difficulty`는 `easy`, `medium`, `hard` 중 하나입니다.
- `answer`는 정답 보기의 위치이며 첫 번째 보기는 `0`입니다.

## 실행

Node.js 22.13 이상이 필요합니다.

```bash
npm install
npm run dev
```

## 검증

```bash
npm test
npm run lint
```

## 저장 기준

진행 중 시험, 마지막 결과, 오답노트는 브라우저의 `localStorage`에 저장됩니다.
따라서 로그인이나 서버 없이 같은 브라우저에서 이어 풀 수 있지만, 다른 기기와는 동기화되지 않습니다.
