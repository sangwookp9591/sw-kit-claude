---
name: debug
description: "과학적 디버깅. 증상→가설→증거→반증→결론. Klay(탐색) + Jay(수정) + Milla(검증) 협업."
triggers: ["debug", "디버그", "버그", "안돼", "안됨", "에러", "오류", "fix bug"]
---

# /aing debug — Scientific Debugging

## Usage
```
/aing debug <증상>          — 새 디버그 세션 시작
/aing debug                 — 미완료 세션 재개
/aing debug --list          — 전체 세션 목록 조회
```

## Mode Detection

| 인자 | 모드 |
|------|------|
| `--list` | 목록 조회 → `references/templates-and-modes.md` Mode C |
| 인자 없음 + OPEN/INVESTIGATING 세션 있음 | 재개 → `references/templates-and-modes.md` Mode B |
| 인자 있음 | 새 세션 (아래 Step 1~7) |

---

## Mode A: 새 세션 시작

### Step 1: 디렉토리 + slug 생성

```bash
mkdir -p .aing/debug
```

Slug 규칙: 공백→`-`, 한글 제거 후 영문 요약 (예: "로그인 안됨" → `login-failure`), 최대 30자, 소문자.

### Step 2: DEBUG.md 파일 생성

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/scripts/cli/persist.js" debug-init \
  --dir "$(pwd)" --slug "{slug}" --title "{symptom}" --date "{YYYY-MM-DD}"
```

실패 시 Write 도구로 직접 생성. → 템플릿: `references/templates-and-modes.md`

### Step 3: Klay — 증상 수집
Klay를 스폰하여 코드베이스 탐색 + 증거 수집. 출력: SYMPTOM_REPORT.
→ 프롬프트: `references/agent-prompts.md` Step 3

### Step 4: Klay — 가설 생성
증상 보고서 기반 경쟁 가설 생성. 출력: HYPOTHESIS_SET + Discriminating Probe.
→ 프롬프트: `references/agent-prompts.md` Step 4

### Step 5: Jay — 가설 검증 + 수정
상위 가설 검증. CONFIRMED → 수정 코드 작성, REFUTED → 다음 가설, INCONCLUSIVE → 추가 조사.
→ 프롬프트: `references/agent-prompts.md` Step 5

### Step 6: DEBUG.md 업데이트
매 가설 테스트 후 Edit 도구로 결과 기록.

### Step 7: Milla — 수정 검증
수정 적용된 경우 Milla로 검증. Verdict: PASS / FAIL.
→ 프롬프트: `references/agent-prompts.md` Step 7

## Loop Control

```
Step 5 REFUTED → 다음 가설 (Step 5 반복)
모든 가설 REFUTED → Step 4로 돌아가 재시도
최대 3 가설 사이클
수정 적용 → 반드시 Step 7 검증
Milla FAIL → 수정 롤백 + 대안 접근
```

## Error Handling

- Klay Step 3 실패 → 사용자에게 증상 상세 요청
- 3 사이클 후 모든 가설 REFUTED → 증거 요약 + 가이드 요청
- Jay 수정이 Milla FAIL → 롤백, 대안 시도

## State Persistence

디버그 세션은 `.aing/debug/{YYYY-MM-DD}-{slug}.md` 에 저장:
증상 보고서, 테스트된 가설, 수집된 증거, 최종 판정 및 수정 사항.

## 규칙

- 추측으로 코드 수정 금지 — CONFIRMED 가설만으로 수정 진행
- 모든 가설 테스트 결과를 DEBUG.md 에 즉시 기록
- 최소 2개 이상의 가설 생성 필수 (확증 편향 방지)
- 각 가설에 Evidence AGAINST 포함 필수 (반증 가능성)
- 수정 후 반드시 Milla 검증 실행
- 세션 종료 전 Status 업데이트 필수
