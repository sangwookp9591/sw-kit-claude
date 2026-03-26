---
name: refactor
description: "구조적 리팩토링. Klay(영향 분석) → Derek/Jay(실행) → Milla(검증). 안전한 단계별 변환."
triggers: ["refactor", "리팩토링", "리팩터", "구조 정리", "구조 개선", "clean up"]
---

# /aing refactor — Structural Refactoring

## Usage
```
/aing refactor <target>
/aing refactor "auth 모듈을 서비스 패턴으로 분리"
/aing refactor src/utils/ "중복 제거"
```

## Step 1: Impact Analysis (Klay)

Spawn Klay to analyze refactoring scope and risk:

```
Agent({
  subagent_type: "aing:klay",
  description: "Klay: 리팩토링 영향 분석 — {target}",
  model: "sonnet",
  prompt: "[REFACTOR ANALYSIS]
다음 리팩토링 대상을 분석하세요: {target}

수행:
1. 대상 코드 읽기 및 현재 구조 파악
2. 의존 관계 추적 (import/export, 호출 체인)
3. 테스트 커버리지 확인 (관련 테스트 파일 존재 여부)
4. 변경 영향 범위 산정

출력 포맷:
## Refactor Analysis
### Current Structure
- {파일}: {역할} ({lines}줄)

### Dependency Map
- {파일} → imports → {파일들}
- {파일} ← used by ← {파일들}

### Affected Files
| File | Change Type | Risk |
|------|------------|------|
| {path} | modify/rename/delete/create | high/med/low |

### Test Coverage
- {파일}: {covered/uncovered} — {test file if exists}

### Recommended Strategy
- Approach: {rename/extract/inline/split/merge}
- Order: {step-by-step safe order}
- Checkpoints: {where to verify before continuing}

### Risk Assessment
- Complexity: {low/mid/high}
- Breaking Changes: {yes/no} — {details}
- Rollback Plan: {strategy}"
})
```

## Step 2: Complexity Scoring

Parse Klay's analysis:
- **low** (affected files ≤ 3, no breaking changes): Single agent execution
- **mid** (4-10 files, or has breaking changes): Dual agent + checkpoint
- **high** (>10 files, cross-domain): Full team + mandatory test verification per step

## Step 3: Checkpoint Creation

**MANDATORY** before any code changes:

```bash
git stash list > /dev/null 2>&1
CHECKPOINT=$(git rev-parse HEAD)
echo "Refactor checkpoint: $CHECKPOINT"
```

Save checkpoint to `.aing/state/checkpoints.json` for rollback.

## Step 4: Execution

### Low complexity: Single agent
```
Agent({
  subagent_type: "aing:jay",  // or derek for frontend
  description: "Jay: 리팩토링 실행 — {target}",
  model: "sonnet",
  prompt: "[REFACTOR EXECUTE]
다음 리팩토링을 실행하세요.

=== ANALYSIS ===
{Klay's analysis}

=== TASK ===
{user's refactoring request}

Rules:
- Klay의 recommended order를 정확히 따를 것
- 각 단계 후 기존 테스트가 통과하는지 확인
- import/export 경로 업데이트 누락 금지
- 기능 변경 없이 구조만 변경 (behavior-preserving)
- 변경한 파일 목록을 출력에 포함"
})
```

### Mid/High complexity: Staged execution
Backend(Jay)와 Frontend(Derek)를 **순차 실행** (의존성 때문에 병렬 불가):

1. Core/shared 변경 먼저 (Jay)
2. UI/consumer 변경 후 (Derek)
3. 각 단계 후 테스트 실행

## Step 5: Verification (Milla)

```
Agent({
  subagent_type: "aing:milla",
  description: "Milla: 리팩토링 검증 — {target}",
  model: "sonnet",
  prompt: "[REFACTOR VERIFY]
리팩토링 결과를 검증하세요.

=== ORIGINAL ANALYSIS ===
{Klay's analysis}

=== CHANGES MADE ===
{list of changed files}

검증 항목:
1. git diff로 변경사항 확인 — 기능 변경 없이 구조만 변경되었는지
2. 모든 import/export 경로가 올바른지
3. 죽은 코드(unreachable)가 남아있지 않은지
4. 테스트 실행 결과 확인

출력 포맷:
## Refactor Verification
| Check | Status | Detail |
|-------|--------|--------|
| Behavior preserved | PASS/FAIL | {detail} |
| Imports updated | PASS/FAIL | {detail} |
| No dead code | PASS/FAIL | {detail} |
| Tests passing | PASS/FAIL | {detail} |

## Verdict: PASS / FAIL
## Rollback Needed: yes/no"
})
```

## Step 6: Report

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  aing refactor: {target}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Files Changed: {N}
  Complexity: {level}
  Checkpoint: {git hash}

  Verification: {PASS/FAIL}
  Rollback: /aing rollback (if needed)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Error Handling
- Klay fails → ask user to manually describe scope
- Execution agent fails mid-refactor → auto-rollback to checkpoint
- Milla verdict FAIL → prompt user: rollback or manual fix
- Test failure → stop immediately, show failing test, suggest rollback
