# 인계 문서 (2026-11-14)

클라우드 세션에서 만든 작업을 로컬(Desktop Claude Code + VS Code)에서 이어받기 위한 전체 인계서.
요약 지침은 루트 `CLAUDE.md`, 꼭 알아야 할 주의점은 `docs/KEY_POINTS.md`.

## 1. 프로젝트 한 줄 요약
가족 4명이 각자 여러 증권사 계좌로 **균등 공모주 청약**을 하고, 1인당 100만 원의 증거금을 돌려 쓰며, 배정·매도 결과를 기록하는 앱.
처음에는 개인 도구로 구상했다가 가족용(4명)으로 확정했다.

## 2. 20문답으로 확정한 결정
| 항목 | 결정 |
|---|---|
| 동기 | 공모주를 막 시작한 초보가 청약을 놓치지 않고 수익을 내기 위함 |
| 성격 | 개인·가족용. 수익 모델·커뮤니티·공개 배포 없음 |
| 자금 | 1인당 100만 원(가구 합계 400만 원), 계좌는 청약 가능한 모든 증권사 |
| 전략 | 다계좌 균등 청약. 병목은 증거금 → **증거금 플래너**가 1순위 기능 |
| 종목 선택 | 처음엔 전량 균등 청약 → 기록이 쌓이면 지표 기반 선별로 확장(2차) |
| 대상 | 일반 공모주 + 스팩 (리츠·해외·코넥스 제외) |
| 자금 운용 | 종목별 집중: 주관사·인수사 계좌에만 필요한 증거금을 이체, 환불일 후 회수 |
| 매도 | 증권사 앱에서 직접 매도. 앱은 상장일 알림 + 실제 매도가·순수익 기록(시세 연동 없음) |
| 상태 추적 | 종목 단위 요약 + 계좌는 "청약 완료" 체크, 배정 수량·매도는 계좌별 수동 입력 |
| 홈 화면 | "오늘 할 일" 중심. 하단 탭: 홈/종목/캘린더/기록/설정 |
| 데이터 확보 | 반자동: DART 목록 자동 수집 + 청약일·공모가 수동 보정 (**DART는 12월 검증**) |
| 알림 | 카카오톡 "나에게 보내기"(가족 각자) + 앱 내 로컬 알림(보조) |
| 알림 시각(KST) | 청약 마감 당일·환불일 09:00 / 마감 전날 이체 18:00 / 상장일 08:30 |
| 성공지표 | 월 누적 순수익, 자금 회전율, 놓친 청약 수. 목표 수익은 정하지 않고 기록하며 판단 |
| 첨부 | 없음(텍스트 메모만) — Storage는 Blaze 필요 |
| 인증/공유 | Google 로그인, 관리자가 등록한 가족 이메일만 합류. 종목 보정은 가족 모두 가능, 기록은 본인만 수정·가족은 열람 |
| 비용 | 0원 목표: Firebase Spark + GitHub Actions 무료 한도, 카드 등록 없음 |
| 플랫폼 | Android + 웹(PC) |
| 민감정보 | 계좌번호·비밀번호·실제 잔고 저장 안 함 |
| 법·규제 | 개인·가족용 확정, 공개 시 재검토(보류). 계산은 참고용 |

## 3. 구현 중 문답과 달라진 점
1. **카카오 토큰 저장 위치**: GitHub Secrets가 아니라 Firestore `kakaoTokens/{uid}`(클라이언트 접근 불가, Admin SDK 전용). 리프레시 토큰 갱신을 자동 저장하려면 필요.
2. **계좌·청약 기록 경로**: `users/{uid}/…`가 아니라 `households/{hid}/accounts|subscriptions` + `ownerUid` 필드(가족 합산·권한 검사가 단순).
3. **캘린더**: 월간 격자가 아니라 앞으로 60일 아젠다 목록.
4. **증권사 값**: 기본값(최소 10주, 증거금률 50%, 청약 수수료 0원)만 넣고 설정 화면에서 직접 입력.

## 4. 코드 구조
```
src/app/                 Expo Router 화면
  _layout.tsx            로그인·가족 그룹 게이트, 로컬 알림 등록
  (tabs)/                index(홈) ipos calendar records settings
  ipo/[id].tsx           종목 상세(정보 편집, 증거금 플랜, 계좌별 진행, 가족 현황). id='new' 면 추가
src/lib/                 순수 로직 (+ __tests__)
  planner.ts             증거금 플래너: 필요 증거금, 묶인 자금 차감, 계좌 추천
  todo.ts                오늘 할 일 생성 (transfer/subscribe/refund/allocation/listing)
  stats.ts               월 순수익·자금 회전율·놓친 청약
  notify.ts              알림 슬롯(morning/evening/listing)별 메시지
  ipo.ts brokers.ts dates.ts types.ts format.ts
src/data/store.tsx       Firestore 구독 + 쓰기 (DataProvider, useData, useMine)
src/firebase/            config.ts, client.ts(웹), client.native.ts(Android, AsyncStorage 지속성)
src/auth/                AuthContext, google.ts(네이티브), google.web.ts(팝업)
src/notifications/       localReminders.ts (앞으로 7일 로컬 알림, Android)
scripts/                 notify.ts, collect-dart.ts, kakao-login.ts, lib/(kakao, dart, admin)
.github/workflows/       ci.yml, notify.yml, collect-dart.yml
firestore.rules          보안 규칙
docs/                    기획서_v0.1.docx, wireframe.html, SETUP.md, HANDOFF.md, KEY_POINTS.md
```

### Firestore 데이터 모델
```
households/{hid}                      name, adminUid, memberEmails[≤4], createdAt
  members/{uid}                       uid, email, name, budget
  ipos/{id}                           collected{}, manual{}, dartRceptNo, updatedBy, updatedAt
  brokers/{id}                        id, name, minUnits, marginRate, subscribeFee
  accounts/{id}                       brokerId, alias, ownerUid
  subscriptions/{ipoId_accountId}     transferred, subscribed, skipped, refundChecked,
                                      allocatedQty, sellPrice, sellQty, sellCosts, memo, ownerUid
kakaoTokens/{uid}                     refreshToken, updatedAt   (클라이언트 접근 불가)
```
종목의 실제 값은 `effective(ipo) = { ...collected, ...manual }` (수동 보정값 우선). 종목 상태는 저장하지 않고 계좌 행에서 계산한다.

## 5. 검증된 것 / 검증되지 않은 것
**검증됨**: `npm run typecheck`, `npm test`(33개), `expo export`(웹·Android 번들), 환경 변수 치환, 설정이 비었을 때 "설정이 필요해요" 화면, 와이어프레임 렌더링, docx 구조 검증.
**검증 못함** (Firebase 프로젝트·계정이 없어서):
- 실제 Google 로그인, Firestore 읽기/쓰기, 화면 동작(종목 상세 저장, 계좌 체크 등)
- `firestore.rules` (에뮬레이터를 받을 수 없었음) → 배포 후 콘솔 규칙 플레이그라운드로 확인
- 카카오 연동과 알림 수신, GitHub Actions 실제 실행
- DART 응답 형식 가정(`C001`, `corp_cls=E`)

## 6. 현재 진행 상황 (사용자 기준)
- [x] Firebase 프로젝트 `JFLOW` 생성(Spark), 웹 앱 등록
- [ ] **← 지금 여기**: `.env`에 `firebaseConfig` 값 6개 + 웹 클라이언트 ID 입력
- [ ] Authentication → Google 사용 설정 (웹 클라이언트 ID 복사)
- [ ] Firestore 데이터베이스 만들기 (서울 `asia-northeast3`, 프로덕션 모드)
- [ ] `.firebaserc` 만들고 `npx firebase-tools deploy --only firestore:rules`
- [ ] `npm install` → `npm run web` → 로그인, "새 가족 그룹 만들기" 확인
- [ ] 가족 3명 이메일 추가, 각자 계좌 등록, 증권사 설정(실제 공지 기준 값)
- [ ] 카카오 개발자 앱 + 가족 팀원 초대 + 가족 각자 `npm run kakao:login`
- [ ] GitHub Secrets/Variables 등록 → 알림 워크플로우 dry-run → 실제 발송 확인
- [ ] 실제 종목 1개로 리허설 (11월 말 청약 전)
- [ ] (12월) DART 수집 검증, (필요 시) Android 개발 빌드

상세 클릭 순서는 `docs/SETUP.md`.

## 7. 로컬에서 시작하는 법
```bash
git clone -b claude/peaceful-galileo-auh1h7 https://github.com/sjiubf/J_FLOW.git
cd J_FLOW
copy .env.example .env     # Windows. 그다음 .env 를 열어 값 입력
npm install
npm run web
```

## 8. 다음에 하면 좋은 개선 (우선순위 낮음)
- 가족 구성원 합류 직후 프로필 생성 중 규칙 거부 시 무한 로딩 방지(오류 표시)
- 종목 상세에서 "이번 종목 증거금 요약"을 홈 카드에도 더 눈에 띄게
- 월간 격자 캘린더, 지표 기반 선별(기록 축적 후)
- 규칙 에뮬레이터 테스트 추가(`@firebase/rules-unit-testing`)
