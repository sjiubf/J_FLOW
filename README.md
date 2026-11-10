# 공모픽 (가칭)

가족 4명이 함께 쓰는 **공모주 청약 관리 앱**. 다계좌 균등 청약을 놓치지 않고, 증거금(1인 100만 원)을 돌려 쓰며, 배정·매도 결과를 기록한다.

- 기획서: [`docs/기획서_v0.1.docx`](docs/기획서_v0.1.docx) · 화면 설계: [`docs/wireframe.html`](docs/wireframe.html) · 설정 가이드: [`docs/SETUP.md`](docs/SETUP.md)

## 구성

| 영역 | 내용 |
|---|---|
| 앱 | Expo(React Native) + Expo Router, Android + 웹 |
| 백엔드 | Firebase **Spark(무료)**: Authentication(Google), Firestore |
| 서버 작업 | GitHub Actions: 카카오톡 알림 발송, DART 공모주 수집 |
| 핵심 로직 | `src/lib/` — 증거금 플래너, 오늘 할 일, 손익 통계(순수 TypeScript, 단위 테스트 있음) |

```
src/app/            화면 (홈 / 종목 / 캘린더 / 기록 / 설정, 종목 상세)
src/lib/            도메인 로직 (planner, todo, stats, notify …) + __tests__
src/data/store.tsx  Firestore 구독·쓰기
src/firebase/       클라이언트 초기화 (웹/네이티브 분리)
scripts/            notify.ts, collect-dart.ts, kakao-login.ts (Admin SDK)
firestore.rules     보안 규칙 (가족 이메일 허용 목록)
.github/workflows/  ci.yml, notify.yml, collect-dart.yml
```

## 개발

```bash
npm install
npm run typecheck   # 타입 검사
npm test            # 단위 테스트 (vitest)
npm run web         # 웹 개발 서버 (.env 필요)
```

Firebase·카카오·GitHub 설정은 [`docs/SETUP.md`](docs/SETUP.md)를 따른다.

## 원칙

- 계좌번호·비밀번호·실제 잔고는 저장하지 않는다.
- 개인·가족용. 공개 배포나 제휴·광고는 하지 않는다(공개 시 투자자문업 등 재검토).
- 앱의 계산은 참고용이며 투자 권유나 세금 신고 자료가 아니다.
