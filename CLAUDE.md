# 공모픽 (J_FLOW) — Claude Code 작업 지침

가족 4명(성인)이 쓰는 **공모주 청약 관리 앱**. 개인·가족용이며 공개 배포·제휴·광고는 하지 않는다.
**이 파일을 먼저 읽고, 이어서 `docs/HANDOFF.md`(전체 인계)와 `docs/KEY_POINTS.md`(중요 포인트)를 읽을 것.**

## 사용자
- 한국어로 소통한다. 개발 숙련자가 아니므로 **명령어는 복사 가능한 코드 블록**으로, 한 번에 한 단계씩, 화면의 한글 메뉴 이름 그대로 안내한다.
- Windows PC + VS Code. 스크린샷을 보내며 질문하는 경우가 많다.
- 키·토큰·서비스 계정 JSON은 **채팅에 붙이지 않게** 안내하고, 파일에 직접 입력하도록 한다.

## 기술 스택
Expo(SDK 58) + Expo Router(`src/app`), React Native 0.88, TypeScript, Firebase(웹 SDK, **Spark 무료 플랜**: Auth Google, Firestore),
GitHub Actions(카카오톡 알림, DART 수집), vitest.

## 명령어
```bash
npm install            # .npmrc 에 legacy-peer-deps=true 가 설정되어 있음
npm run typecheck      # tsc --noEmit
npm test               # vitest (현재 33개 통과)
npm run web            # 웹 개발 서버 (.env 필요)
npm run export:web     # 웹 번들 빌드 확인
```
작업을 끝내기 전에 `typecheck`와 `test`를 반드시 실행한다.

## 구조
- `src/lib/` 순수 도메인 로직(planner, todo, stats, notify, ipo, brokers, dates) + `__tests__` — **RN/Firebase 의존 금지**
- `src/data/store.tsx` Firestore 구독·쓰기, `src/firebase/` 클라이언트(웹/네이티브 분리), `src/auth/` 로그인
- `scripts/` Admin SDK 스크립트(`notify.ts`, `collect-dart.ts`, `kakao-login.ts`), `.github/workflows/`
- `firestore.rules` 보안 규칙, `docs/` 기획서·와이어프레임·설정 가이드·인계 문서

## 절대 지킬 것
1. `.env`, `google-services.json`, `serviceAccount*.json`, 카카오 키·토큰은 **커밋 금지**(`.gitignore`에 있음). 로그에도 출력하지 않는다.
2. 환경 변수는 반드시 `process.env.EXPO_PUBLIC_NAME` **직접 참조**. 변수에 담아 쓰면 빌드 시 값이 치환되지 않는다.
3. Firebase **Spark 플랜 유지**: Cloud Functions·Cloud Storage·카드 등록이 필요한 기능을 추가하지 않는다.
4. 계좌번호·비밀번호·실제 잔고는 저장하지 않는다.
5. 앱 안에 "매수 추천" 같은 투자 권유 표현을 넣지 않는다(계산은 참고용 문구 유지).
6. 사용자가 요청하기 전에는 **PR을 만들지 않는다**. 개발 브랜치: `claude/peaceful-galileo-auh1h7`.
7. `npx expo install`은 이 클라우드 환경에서 막혔다. 로컬에서는 사용 가능하지만, 막히면 `node_modules/expo/bundledNativeModules.json`의 버전을 사용한다.

## 현재 상태 (2026-11-14 기준)
- 코드 완성(M1~M4 + 카톡 알림 + DART 수집 목록). 타입 검사·테스트·웹/Android 번들 통과.
- Firebase 프로젝트 `JFLOW` 생성, 웹 앱 등록 완료(Spark). **진행 중: `.env` 채우기.**
- 남은 설정: Authentication(Google) 켜기 → Firestore 생성 → `.env` → 규칙 배포 → 웹 실행 확인 → 카카오 연동 → GitHub Secrets.
- 목표: **11월 말 청약부터 실사용**.
