# THINK GYM · 도형 챌린지 07

원본 문제지 7(1)~7(4)의 20문제를 7(5)의 정답 카드로 완성하는 한국어 웹앱입니다.

- 검정과 금색 디자인, 모바일·태블릿 반응형
- 이름 입력, 카드 선택 후 빈칸 클릭 또는 마우스 드래그
- 각 장의 5문제 완료 후 다음 장으로 자동 이동
- 20개 정답 카드가 각 단계 하단에 표시되며 사용한 카드는 표시 유지
- 합격 화면, 서버 측 시간 측정, 공동 순위, 상위 100개 도전 기록
- 순위표와 합격 화면의 1~3위 금·은·동 트로피 표시
- 같은 탭 새로고침 시 진행 복구, 저장 실패 시 재시도 가능

## 실행

Node.js 22 이상에서 `node server.js` 실행 후 http://127.0.0.1:4173 접속. 프런트엔드 패키지 설치가 필요 없습니다. `node --test game.test.js`로 기본 검증을 실행합니다.

## 배포

Vercel의 Other 프레임워크, 빌드 명령 없음, 출력 디렉터리 `public`. `vercel.json`에 설정되어 있습니다.

## Supabase

프로젝트: thinkgym-manager-seoul-20260415 (`derupekdpfitfcmutcxq`). 전용 테이블 `public.shape7_sessions`, Edge Function `shape7-game`을 사용합니다. `schema.sql`과 `shape7-edge.ts`가 서버 소스입니다. Edge Function은 공개 호출을 받아 세션 토큰 해시를 확인합니다. 서비스 키는 Edge Function 환경에서만 사용하며 브라우저에 포함되지 않습니다. RLS와 권한 회수로 테이블 및 SQL 함수에 대한 익명 직접 접근을 차단합니다.

서버에서 정답, 단계 순서, 시작·종료 시간과 순위를 검증합니다. 정답 이미지와 대조표는 학습 콘텐츠이므로 클라이언트에서도 확인할 수 있으며, 전문적인 부정행위 방지 시스템은 아닙니다. 같은 초의 기록은 공동 순위이며 도전마다 한 기록을 저장합니다. 한 사람의 중복 참여를 식별하거나 개인별 최고 기록을 합산하지 않습니다.

이름 또는 별명과 완료 시간은 공개 순위표에 표시됩니다. IP 원문은 저장하지 않고 서버 비밀값과 함께 해시한 값을 시작 요청 제한(시간당 120회)에 사용합니다. 미완료 세션은 24시간 후 재개할 수 없습니다. 운영자의 데이터 삭제는 Supabase에서 수행합니다.

## 정답 대응

7(5)를 왼쪽 위부터 가로로 1~20번으로 매깁니다.

| 문제지 | 위에서부터 정답 번호 |
|---|---|
| 7(1) | 1, 2, 3, 4, 5 |
| 7(2) | 11, 12, 13, 14, 15 |
| 7(3) | 16, 17, 18, 19, 20 |
| 7(4) | 6, 7, 8, 9, 10 |

원본 문제와 정답 이미지의 THINK GYM 표시를 유지했습니다.


## Upper elementary packing puzzle

- `/upper-programs.html` offers the existing four-direction puzzle and the new `/packing.html` 5×5 packing puzzle.
- Seven original fixed-orientation pieces support tap-to-place, pointer dragging, repositioning, removal, and local session recovery. The first occupied cell in the top row is the tap anchor.
- All seven pieces must cover 25 cells without overlaps or out-of-bounds cells. Every valid tiling is accepted; the reference solution is not shipped to the game page.
- `packing-schema.sql` and `packing-edge.ts` provide server-timed completion, idempotent submission, shuffled card order, a separate leaderboard, and service-only database access.
- Admin listing, individual deletion and atomic reset include the fifth game table. Deploy the packing schema before the updated admin schema and edge function.
- Run `npm test` for the original puzzle and packing geometry checks.

## 운영 주소

https://thinkgym-shape-challenge.vercel.app

운영 사이트에서 이름 입력, 오답 피드백, 전체 20문제 완료, 4단계 전환, 합격 및 순위 저장, 새로고침 복구, 모바일 카드 입력을 검증했습니다. 익명 역할의 직접 테이블 조회·삽입·정답 SQL 함수 호출 권한이 모두 차단됨을 확인했습니다.

## 무작위 카드 배치

새 게임 시작마다 Supabase에서 카드 20개를 무작위로 섞어 `shape7_sessions.card_order`에 저장합니다. 같은 게임의 정답 처리·단계 전환·새로고침에서는 배치를 유지합니다. 화면의 카드 번호는 현재 위치이며 원본 정답 번호를 노출하지 않습니다. 기존 데이터베이스 업데이트용 SQL은 `shuffle-cards.sql`입니다.

## Administrator and audio

- `/admin.html` prefills the administrator username only. The password is entered by the operator.
- `thinkgym-admin` is a Supabase Edge Function with custom authentication: PBKDF2-SHA256 password verification, hashed one-hour bearer sessions, per-IP login throttling, and revoked-session checks on every protected operation.
- `admin-schema.sql` adds service-role-only tables and functions. Provision the salted password hash separately; credentials are never included in repository files or public assets.
- The dashboard lists all completed records in pages of 50, preserving tied ranks. Individual deletion targets an explicit record/program. Reset runs atomically across the four active game tables and only removes completions at or before the displayed snapshot; in-progress sessions are preserved.
- Background audio is an original Web Audio melody. Browser autoplay rules may require a first click; the sound preference and melody position persist between same-tab pages. Hidden pages stop audio and the existing completion fanfare takes priority.
- Back navigation leads to the parent age/grade selection page. The supplied partner logos are original unmodified PNG files.

Validation: existing game tests pass; live admin API verified wrong-password rejection, unauthenticated-delete rejection, all four record lists, deletion of a dedicated test record, confirmation enforcement, logout and revoked-token rejection. Whole-reset behavior was checked with four old-dated test records inside a rolled-back transaction, without changing children's records.
