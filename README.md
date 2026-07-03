# Study Alarm

HTML/CSS/JavaScript로 만든 웹 알람 프로그램입니다.

## 주요 기능

- 현재 시간 실시간 표시
- 알람 제목과 시간 등록
- 매일 반복 / 한 번만 알람 선택
- 알람 ON/OFF 전환
- 알람 삭제 및 전체 삭제
- 브라우저 localStorage 저장
- 브라우저 알림 권한 요청
- 별도 mp3 없이 Web Audio API로 알람 소리 재생

## 파일 구조

```text
AI2606/
├─ index.html
├─ style.css
├─ script.js
└─ README.md
```

## GitHub Pages 배포 방법

1. GitHub Repository의 Settings로 이동합니다.
2. Pages 메뉴를 엽니다.
3. Source를 `Deploy from a branch`로 설정합니다.
4. Branch를 `main`, Folder를 `/root`로 선택합니다.
5. Save를 누르면 잠시 후 배포 주소가 생성됩니다.

## 주의사항

웹 알람은 브라우저 탭이 열려 있을 때 가장 안정적으로 작동합니다.
