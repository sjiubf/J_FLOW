# 로컬 오픈소스 AI 설치 — 작업 인계 (2026-11-24 기준)

## 목표
개인 Windows PC에 오픈소스 AI(LLM)를 설치해 로컬에서 실행한다. 포터블(USB) 구성도 관심 있음.

## 사용자 PC 사양 (PowerShell로 확인한 실측값)
| 항목 | 값 |
|---|---|
| RAM | 15.7GB |
| GPU | Intel UHD Graphics 620 (내장, AI 가속 불가 → CPU 실행) |
| C: 여유 공간 | 194.6GB |
| 사용자 폴더 | C:\Users\ANY1 |
| PowerShell | Windows PowerShell (구버전 5.x 안내 문구 표시) |

## 결론: 권장 구성
- 도구: **LM Studio** (설치 완료, 사용자가 확인함)
- 모델: **Qwen3 4B, Q4_K_M** (약 2.5GB). CPU 기준 초당 2~5토큰 예상.
- 대안: 부족하면 Qwen3 8B(느려짐), 느리면 Qwen3 1.7B / Gemma 3 1B.
- 한국어는 Qwen, Gemma 계열이 무난.

## 도구 비교 (참고)
| 도구 | 특징 |
|---|---|
| LM Studio | 설치형 GUI, 가장 쉬움 (선택함) |
| Ollama | 명령어 기반, 앱 연동(API)에 유리. Open WebUI와 조합 가능 |
| llamafile / llama.cpp | 설치 없이 실행, 진짜 포터블(USB) |

## 진행 상황
- [x] PC 사양 확인
- [x] LM Studio 설치 (사용자가 직접 설치 완료)
- [ ] 모델 저장 폴더 생성 (`C:\AI\models`)
- [ ] `lms bootstrap` 으로 명령줄 도구 준비
- [ ] 모델 다운로드 (`lms get qwen3-4b`)
- [ ] 실행 확인 (`lms load qwen3-4b`, `lms chat` 또는 LM Studio Chat 화면)
- [ ] (선택) 모델 저장 위치를 C:\AI\models 로 변경

## 남은 명령 (PowerShell, 순서대로)
```powershell
New-Item -ItemType Directory -Force -Path C:\AI\models | Out-Null; Test-Path C:\AI\models
& "$env:USERPROFILE\.lmstudio\bin\lms.exe" bootstrap
lms get qwen3-4b
lms load qwen3-4b
lms chat
```
- `lms`를 못 찾으면 LM Studio를 한 번 실행했다 종료한 뒤 PowerShell을 새로 연다.
- `lms get` 목록에서 `Q4_K_M` 항목 선택.
- 저장 위치 변경: LM Studio → My Models(폴더 아이콘) → Models Directory → Change → `C:\AI\models` (이미 받은 모델은 옮겨지지 않으므로 다운로드 전에 변경).
- 확인 문장: `안녕, 한국어로 두 문장 자기소개 해줘`

## 연결 관련 (중요)
- 이 세션의 Desktop Commander는 사용자 PC가 아니라 **클라우드 Linux VM**에 연결돼 있었다. PC에는 접속되지 않았다.
- `list_computer_folders` 결과가 계속 비어 있음 → PC 폴더 공유가 안 된 상태.
- PC 직접 연결하려면: Claude 데스크톱 앱(같은 계정 로그인) → 설정 → Claude Code → Remote Control → `C:\AI` 폴더 추가 → 앱 실행 유지 → 새 세션에서 폴더 목록 확인 후 연결 요청(PC에서 승인).
- 계정에 따라 이 기능이 아직 없을 수 있음. 안 되면 사용자가 PowerShell에 명령을 직접 실행하고 결과를 보내는 방식으로 진행.

## 사용자 선호 (작업 방식)
- 한국어로 소통, 명령어는 복사 가능한 코드 블록, 개발 숙련자가 아님.
- "중요사항 아니면 끝까지 진행" 요청. 필요한 폴더는 직접 만들어도 됨.
- 키·토큰은 채팅에 붙이지 않게 안내.

## 새 창에서 시작할 때
이 파일을 먼저 읽고, 위 "진행 상황"의 미완료 항목부터 이어서 진행한다.
