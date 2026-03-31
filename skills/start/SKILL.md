---
name: start
description: "aing 초기 셋업 위자드. 스코프 선택, HUD 설정, 실행 모드 구성을 인터랙티브로 진행."
triggers: ["start", "setup", "초기설정", "셋업", "setup aing", "aing setup"]
metadata:
  filePattern: []
  bashPattern: []
---

# /aing start — Interactive Setup Wizard

aing 첫 실행 또는 재설정 시 인터랙티브 셋업을 진행합니다.

**When this skill is invoked, immediately execute the workflow below. Do not only restate or summarize these instructions back to the user.**

## Flag Parsing

| Flag | 동작 |
|------|------|
| `--help` | Help Text 표시 후 중단 |
| `--local` | Phase 1 only (target=local), 중단 |
| `--global` | Phase 1 only (target=global), 중단 |
| `--force` | Pre-Setup Check 건너뛰고 전체 실행 |
| (없음) | Pre-Setup Check → 전체 셋업 |

## Help Text

```
aing Setup - Harness Engineering Agent 초기 설정

USAGE:
  /aing start              초기 셋업 위자드 (또는 이미 설정된 경우 업데이트)
  /aing start --local      이 프로젝트만 설정 (.claude/CLAUDE.md)
  /aing start --global     전체 프로젝트 설정 (~/.claude/CLAUDE.md)
  /aing start --force      전체 위자드 강제 재실행
  /aing start --help       이 도움말
```

## Pre-Setup Check

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/scripts/setup/setup-progress.js" check
```

### Already Configured (no --force)

AskUserQuestion: "aing이 이미 설정되어 있습니다."
1. **CLAUDE.md만 업데이트** — 최신 harness rules 반영 → Phase 1만 실행
2. **전체 셋업 다시** — Phase 1~4 재실행
3. **취소** — 변경 없음

## Resume Detection

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/scripts/setup/setup-progress.js" resume
```

"fresh"가 아니면 AskUserQuestion:
1. **이어서 (Step N부터)** — 중단된 곳에서 재개
2. **처음부터** — `setup-progress.js clear` 후 새로 시작

---

## 4-Phase Pipeline

```
Phase 1: 스코프 선택 + CLAUDE.md 설치
Phase 2: Status Line HUD 설정
Phase 3: 기본 실행 모드 선택
Phase 4: 완료 + 웰컴
```

### Phase 1: CLAUDE.md 설치
- `--local` → `.claude/CLAUDE.md`, `--global` → `~/.claude/CLAUDE.md`
- `<!-- SWKIT:START -->` ~ `<!-- SWKIT:END -->` 마커로 기존 내용 보존
- `--local`/`--global` 플래그 시 Phase 1만 실행 후 중단

### Phase 2: HUD 설정
- Status Line 활성화 여부 선택
- `~/.claude/settings.json`에 statusLine 설정 + HUD 래퍼 생성

### Phase 3: 실행 모드
- auto (추천) / pdca / wizard 중 선택

### Phase 4: 완료
- Welcome banner + GitHub Star (optional)

→ 각 Phase 상세: `references/phase-details.md` 참조
