---
name: plan-task
description: "📋 Able + Klay(+Milla) 다중 관점 계획 수립. 구조화된 출력 + 복잡도 자동 리뷰."
triggers: ["plan", "계획", "기획", "설계"]
---

# /aing plan — Multi-Perspective Task Planning

## Usage
```
/aing plan <task-description>
/aing plan "사용자 인증 API 구현"
```

## Pipeline Overview

```
Able Draft → Complexity Score → Klay Review → [Milla Gap Analysis (high only)] → Able Integration → Persist → Display
```

---

## Step 1: Able Draft

Able이 PLAN_DRAFT 포맷으로 구조화된 초안을 생성합니다.
출력: Meta (complexity signals), Goal, Options (2+), Steps (with files + agents), Acceptance Criteria, Risks.
→ 프롬프트: `references/agent-prompts.md` Able Draft

## Step 1.5: Complexity Scoring

Able의 `## Meta` 섹션에서 complexity signals 추출:

| Signal | Score |
|--------|-------|
| fileCount: ≤2→0, ≤5→1, ≤15→2, >15→3 | |
| domainCount: 1→0, 2→2, 3→3, >3→4 | |
| hasArchChange: +2 | |
| hasSecurity: +2 | |

| Level | Score |
|-------|-------|
| **low** | ≤ 3 |
| **mid** | 4-7 |
| **high** | > 7 |

## Step 2: Klay Architecture Review

Klay가 REVIEW_FEEDBACK 포맷으로 리뷰. Feasibility, Missing Alternatives, Architecture Risks, Verdict.
→ 프롬프트: `references/agent-prompts.md` Klay Review

## Step 2.5: Milla Gap Analysis (high complexity only)

**Score > 7일 때만 실행.** Milla가 CRITIC_FEEDBACK 포맷으로 갭 분석.
- REQUEST_CHANGES → Able에게 피드백 전달 → 재리뷰 (최대 2회)
→ 프롬프트: `references/agent-prompts.md` Milla Gap Analysis

## Step 3: Feedback Integration

Able이 Klay/Milla 피드백을 통합하여 FINAL_PLAN JSON을 생성합니다.
→ 프롬프트: `references/agent-prompts.md` Able Integration

## Step 4: Persist (JSON stdin)

```bash
printf '%s' '{FINAL_PLAN_JSON}' | node "${CLAUDE_PLUGIN_ROOT}/dist/scripts/cli/persist.js" plan --stdin --dir "$(pwd)"
```

`--dir "$(pwd)"` **mandatory**. `printf '%s'` 사용 (echo가 아닌).
Creates: `.aing/plans/{date}-{feature}.md` + `.aing/tasks/task-{id}.json`

## Step 5: Plan Summary Display

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  aing plan: {feature}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Plan: .aing/plans/{date}-{feature}.md
  Tasks: {N}개
  Team: {preset} ({agent names})
  Complexity: {level} ({score}/10)
  Review: Klay ✓ [Milla ✓ if high]

  Options Considered: {N}개
  Recommended: {option name}

  Task Breakdown:
  #1  {task title}          → {agent}
  #2  {task title}          → {agent}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Step 6: Next Action Selection

**MANDATORY**: AskUserQuestion:

1. **/aing team** — 팀 실행 (추천: verify→fix 루프, 품질 보장)
2. **/aing auto** — 단발 실행 (빠르게, verify 없이)
3. **저장만** — 계획만 저장하고 나중에 실행

- Option 1 → `/aing team --plan .aing/plans/{date}-{feature}.md`
- Option 2 → `/aing auto` with plan context
- Option 3 → Confirm save and end

## Error Handling

- Klay 실패 → skip review, Able draft 직접 저장 (graceful degradation)
- Milla 실패 → Klay review만으로 진행
- Milla re-review 2회 초과 → 현재 버전으로 진행
- persist.js stdin 실패 → CLI arg 모드 fallback
