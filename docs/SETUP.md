# 설정 가이드 (사용자가 직접 해야 하는 일)

코드는 모두 준비되어 있습니다. 아래는 **계정·승인이 필요해서 사람이 직접 해야 하는 단계**입니다.
순서대로 하면 11월 말 청약부터 쓸 수 있습니다. 비용은 모두 0원(Firebase Spark, GitHub Actions 무료 한도)입니다.

## 1. Firebase 프로젝트 (M1, 약 20분)

1. [Firebase 콘솔](https://console.firebase.google.com)에서 프로젝트를 만든다. (Google Analytics는 꺼도 됨)
2. **Authentication → 시작하기 → Sign-in method → Google** 사용 설정.
   - 같은 화면의 **웹 SDK 구성**에 있는 **웹 클라이언트 ID**를 복사해 둔다 → `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
   - **설정 → 승인된 도메인**에 `localhost`가 있는지 확인(웹 배포 시 배포 도메인도 추가).
3. **Firestore Database → 데이터베이스 만들기 → 프로덕션 모드**, 위치는 `asia-northeast3(서울)`.
4. **프로젝트 설정 → 일반 → 내 앱 → 웹 앱(</>) 추가** 후 표시되는 SDK 설정 값을 `.env`에 넣는다.
   ```bash
   cp .env.example .env
   ```
5. **Android 앱 추가**: 패키지 이름 `com.gongmopick.app`, SHA-1 인증서 지문 등록(개발 빌드의 디버그 키 또는 EAS 키).
   내려받은 `google-services.json`을 저장소 루트에 둔다(`.gitignore`에 포함되어 커밋되지 않음).
6. 보안 규칙 배포:
   ```bash
   cp .firebaserc.example .firebaserc   # 프로젝트 ID로 수정
   npx firebase-tools login
   npx firebase-tools deploy --only firestore:rules
   ```
   > 규칙 파일(`firestore.rules`)은 에뮬레이터로 검증하지 못했습니다(이 개발 환경에서 에뮬레이터를 받을 수 없었음).
   > 배포 후 콘솔의 **규칙 플레이그라운드**로 "가족 이메일이 아닌 계정은 읽기 거부"를 한 번 확인하세요.

## 2. 앱 실행

```bash
npm install
npm run web            # 웹(PC) 개발 서버
npm run android        # Android 개발 빌드 (Android SDK 필요)
```

Android의 Google 로그인은 네이티브 모듈이라 **Expo Go로는 동작하지 않고 개발 빌드가 필요**합니다.
로컬에 Android SDK가 없다면 EAS 클라우드 빌드를 쓰세요: `npx eas-cli@latest build --profile development --platform android`
(EAS 계정 로그인 필요, `eas.json`은 처음 실행할 때 안내에 따라 생성).

웹을 호스팅하려면(선택):
```bash
npm run export:web
npx firebase-tools deploy --only hosting
```

## 3. 첫 사용 순서 (가족 4명)

1. 관리자 1명이 앱에 Google 로그인 → **"새 가족 그룹 만들기"**.
2. **설정 → 가족**에서 나머지 3명의 Google 이메일을 추가.
3. 가족이 같은 이메일로 로그인하면 자동 합류.
4. 각자 **설정 → 내 계좌**에서 증권사와 별칭 등록, 자금(기본 1,000,000원) 확인.
5. **설정 → 증권사 설정**에서 자주 쓰는 증권사의 최소 청약 주수·증거금률·청약 수수료를 공지에 맞게 입력.

## 4. 카카오톡 알림 (M3, 약 30분 + 가족 각자 5분)

방식: **카카오톡 "나에게 보내기"**. 가족 각자의 카톡으로 알림이 갑니다.

1. [Kakao Developers](https://developers.kakao.com)에서 **애플리케이션 추가**.
2. **카카오 로그인 활성화**, **Redirect URI** 등록(예: `https://localhost/callback` — 코드만 받으면 되므로 실제로 열리지 않아도 됨).
3. **동의항목**에서 **카카오톡 메시지 전송(`talk_message`)**을 설정.
4. **앱 → 멤버(팀원)**에 가족 4명의 카카오 계정을 초대 → 개발 중 상태에서도 팀원은 사용할 수 있어 **심사가 필요 없음**.
5. **REST API 키**를 확인(보안 탭에서 Client Secret을 쓰면 `KAKAO_CLIENT_SECRET`도 필요).
6. 가족 각자 **1회 연동**(로컬 PC, 서비스 계정 키 필요 — 5번 참고):
   ```bash
   export FIREBASE_SERVICE_ACCOUNT="$(cat serviceAccount.json)"
   export KAKAO_REST_API_KEY=...
   npm run kakao:login -- url https://localhost/callback
   # 출력된 주소를 브라우저에서 열어 로그인·동의 → 주소창의 code=XXXX 값을 복사
   npm run kakao:login -- save 가족이메일@gmail.com https://localhost/callback XXXX
   ```
   - 가족이 앱에 **한 번 로그인한 뒤**에 실행해야 합니다(구성원 프로필을 찾기 때문).
   - 토큰은 Firestore `kakaoTokens/{uid}`(클라이언트 접근 불가)에 저장되고, 만료가 다가오면 자동으로 갱신됩니다.
   - 약 두 달 이상 알림이 한 번도 가지 않으면 리프레시 토큰이 만료될 수 있어요. 그땐 6번을 다시 하세요.

## 5. GitHub Secrets (서버 작업용)

1. Firebase 콘솔 → **프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성**. 내려받은 JSON은 **절대 커밋하지 마세요**(`.gitignore`가 `serviceAccount*.json`을 막아 둠).
2. 저장소 **Settings → Secrets and variables → Actions**에 등록:

| 종류 | 이름 | 값 |
|---|---|---|
| Secret | `FIREBASE_SERVICE_ACCOUNT` | 서비스 계정 JSON **전체 내용** |
| Secret | `KAKAO_REST_API_KEY` | 카카오 REST API 키 |
| Secret | `KAKAO_CLIENT_SECRET` | (사용하는 경우만) |
| Secret | `DART_API_KEY` | [opendart.fss.or.kr](https://opendart.fss.or.kr)에서 발급(무료) |
| Variable | `APP_URL` | 알림의 "앱 열기" 링크(웹 배포 주소) |

3. **Actions 탭 → "카카오톡 알림" → Run workflow**에서 `dry_run`을 켠 채 실행해 로그를 확인 → 끄고 한 번 더 실행해 실제 수신 확인.

알림 시각(KST): 청약 마감 당일·환불일 **09:00**, 마감 전날 이체 **18:00**, 상장일 **08:30**.
GitHub 스케줄은 수 분~수십 분 늦을 수 있고, 저장소에 60일간 활동이 없으면 자동 중지됩니다(Actions 탭에서 다시 켜기).

## 6. DART 자동 수집 (M5, 12월 권장)

`DART_API_KEY`를 등록한 뒤 **Actions → "DART 공모주 수집" → Run workflow (dry_run)**.
로그에 "공모주 후보 N건"과 종목명이 나오는지 확인하세요.

> **확인이 필요한 가정**: 공시상세유형 코드(`C001` = 증권신고서·지분증권)와 "상장 전 법인은 `corp_cls=E`"라는 판별 방식은
> 실제 응답으로 검증하지 못했습니다. 결과가 이상하면 `DART_DETAIL_TYPE` 환경 변수나 `scripts/lib/dart.ts`의 필터를 조정하세요.
> 수집값은 종목 이름·유형만 채웁니다. **청약일·공모가·주관사는 종목 상세에서 직접 입력**합니다.

## 7. 알려진 한계

- 계산(증거금, 수수료, 순수익)은 참고용입니다. 청약 일정·공모가·증거금률은 반드시 증권사 공고로 확인하세요.
- 환불일 당일에 자금이 풀려 같은 날 마감인 종목에 쓸 수 있다고 가정합니다(증권사별로 다를 수 있음).
- 청약 수수료는 "배정받았을 때만 부과"로 계산합니다. 증권사 정책과 다르면 증권사 설정에서 0으로 두고 매도 비용에 포함하세요.
- 앱 내 로컬 알림은 Android에서만 동작하고, 앞으로 7일 치를 앱을 열 때마다 다시 예약합니다.
