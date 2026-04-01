---
name: plan-task
description: "📋 AING-DR 6자 합의 계획. Ryan(원칙) → Able(설계) → Klay(반론) → Peter(검증) → Critic(비평) → Persist. 상태 관리 + Interactive + Living ADR."
triggers: ["plan", "계획", "기획", "설계"]
---

# /aing plan — AING-DR Consensus Planning

6자 역할 분담 합의 시스템. 품질 우선 — 비용보다 결정의 정확성을 우선한다.
Confirmation bias 구조적 차단 + 변증법 검증 + 수렴 측정 + 상태 관리.

## Quality Standards (Hard Gates)

APPROVE 조건 — Critic이 검증하는 수치 기준:
- **80%+ claims cite file/line** — 기술적 주장의 80% 이상이 코드베이스 증거를 갖출 것
- **90%+ criteria are testable** — 수락 기준의 90% 이상이 두 개발자가 동일하게 판정 가능할 것
- **100% Constraints honored** — Ryan의 Constraints 전체 충족 (위반 1개 → 자동 REJECT)
- **0 FRAGILE assumptions unaddressed** — FRAGILE 가정이 모두 플랜에서 다뤄질 것
- **0 IGNORED steelman points** — Klay 반론 중 무시된 항목 0개 (Peter 검증)

이 수치에 미달하면 Critic은 APPROVE할 수 없다.

## Phase 0: Pre-execution Gate (모호 요청 차단)

Planning 시작 전에 요청의 구체성을 검증한다.

**구체적 요청 (Gate PASS — 즉시 Phase 1 진행)**:
- 파일 경로 참조 (`src/auth.ts`)
- 코드 심볼 (camelCase/PascalCase/snake_case)
- 이슈/PR 번호 (`#42`)
- 에러 참조 (`TypeError: ...`)
- 번호 매기기 단계 (`1. ... 2. ... 3. ...`)
- 수락 기준 명시
- 코드 블록 포함

**모호한 요청 (Gate BLOCK — 스코핑 필요)**:
모호한 동사만 있고 구체적 앵커가 없는 요청 (≤15단어, 구체적 시그널 0개).

Gate BLOCK 시 AskUserQuestion:
```
요청이 너무 모호합니다. 계획 수립 전에 스코핑이 필요합니다.

"{original request}"

다음 중 하나를 추가해주세요:
1. 수정할 파일 또는 기능 이름
2. 구체적 요구사항 (numbered list)
3. 수락 기준 (어떻게 되면 완료인지)

또는 "force:" 접두사로 강제 진행:
  /aing plan force: {request}
```

`force:` 접두사 → Gate 무시하고 Phase 1 진행.

## Usage
```
/aing plan <task-description>
/aing plan "사용자 인증 API 구현"
/aing plan "데이터 마이그레이션" --deliberate       # 고위험: pre-mortem + rollback 강제
/aing plan "API 리팩토링" --interactive             # 사용자 개입 포인트 활성화
/aing plan "결제 시스템" --deliberate --interactive  # 고위험 + 사용자 개입
```

## Agent Roles (역할 분담)

| Agent | Role | Model | 핵심 책임 |
|-------|------|-------|----------|
| **Ryan** | Deliberation Facilitator | opus | Constraints/Preferences 도출. **Options 없이** 원칙 확정 |
| **Able** | PM / Planner | opus | Options 설계, Steps 분해, Living ADR 생성 |
| **Klay** | Architect / Steelman | opus | 반론(antithesis), 트레이드오프, 원칙-옵션 정합성, 새 Driver 제안 |
| **Peter** | Synthesis Verifier | sonnet | 반론 반영 검증, Delta Score, Confidence Level |
| **Critic** | Deliberation Critic | opus | 5-Phase 심의 품질 비평, Adaptive Harshness, 최종 verdict |

**Milla는 plan-task에 참여하지 않는다** — 보안 전문가 본연의 역할에 집중. 심의 품질은 전용 Critic이 담당.

## Pipeline Overview

```
Phase 1: Ryan — Foundation (Constraints + Preferences)
  ↓
Phase 2: Able — Option Design (AING-DR Draft)
  ↓ Complexity Score (0-15)
  ↓
  ↓ [--interactive: User Review Point 1 — 초안 확인]
  ↓
Phase 3: Klay — Steelman Deliberation
  ↓
Phase 4: Able — Synthesis (반론 통합)
  ↓
Phase 5: Peter — Synthesis Verification + Delta Score
  ↓ PASS → Phase 6  |  REVISE → Phase 4 재작성
  ↓
Phase 6: Critic — 5-Phase Deliberation Critique
  ↓ APPROVE → Phase 7  |  ITERATE → Phase 2 재설계  |  REJECT → 중단
  ↓
  ↓ [--interactive: User Review Point 2 — 최종 승인]
  ↓
Phase 7: Able — Living ADR Generation + Persist
```

## 복잡도별 실행 경로 (품질 우선)

| Level | Score | Ryan | Able | Klay | Peter | Critic | Pre-mortem | Rollback | 합의 루프 |
|-------|-------|------|------|------|-------|--------|------------|----------|----------|
| **low** | ≤ 3 | ✓ | DR Lite | ✓ steelman | ✓ synthesis | ✓ THOROUGH | — | — | 최대 3회 |
| **mid** | 4-7 | ✓ | DR Standard | ✓ steelman | ✓ synthesis + delta | ✓ THOROUGH | — | — | 최대 5회 |
| **high** | > 7 | ✓ | DR Deep | ✓ steelman | ✓ synthesis + delta | ✓ → ADVERSARIAL | ✓ 필수 | ✓ 필수 | 최대 5회 |
| **`--deliberate`** | any | ✓ | DR Deep | ✓ steelman | ✓ synthesis + delta | ✓ → ADVERSARIAL | ✓ 필수 | ✓ 필수 | 최대 5회 |

**품질 우선 정책**: 모든 레벨에서 Ryan → Klay → Peter → Critic 전원 참여.
**자동 `--deliberate` 트리거**: hasSecurity=true 또는 hasArchChange=true이고 score > 5

---

## State Management (상태 관리 — 강제 프로토콜)

### State File
`.aing/state/plan-state.json`

### MANDATORY State Rules

**이 규칙들은 선택이 아닌 강제다. 위반 시 Critic이 REJECT할 수 있다.**

1. **Phase 시작 전 State 기록 필수**: 모든 Phase 시작 시 state 파일을 먼저 갱신한 후 에이전트를 스폰한다.
2. **Phase 시작 전 State 읽기 필수**: 모든 Phase 시작 시 state 파일을 읽어 현재 phase와 일치하는지 확인한다. 불일치 시 경고를 출력하고 state를 교정한다.
3. **State 미기록 시 Critic 검증**: Critic(Phase 6)이 state 파일을 읽어 phase 이력이 연속적인지 확인. 누락된 phase가 있으면 MAJOR finding으로 보고.
4. **Execution Handoff 전 State 비활성화 필수**: Phase 7 완료 후 `/aing team` 또는 `/aing auto` 호출 전에 반드시 `active: false` 기록. 미기록 시 다음 세션에서 stale state 발생.
5. **Terminal Exit 시 State 정리 필수**: REJECT, 최대 반복 초과, 조기 종료 시 반드시 terminated state 기록.

### State Lifecycle

```
Phase 0 (Gate):
  mkdir -p .aing/state
  state = { active: true, phase: "gate", feature: "...", startedAt: "...", iteration: 0 }

Phase 1 시작:
  READ state → 확인 → state.phase = "foundation"

Phase N 시작:
  READ state → phase 연속성 확인 → state.phase = "{current phase}"

Iteration 증가:
  Critic ITERATE 시 state.iteration++, state.phase = "option-design"

Execution Handoff (Phase 7 완료):
  state.active = false
  state.completedAt = "..."
  state.confidence = "HIGH|MED|LOW"
  state.verdict = "APPROVE"

Terminal Exit:
  state = { active: false, terminated: true, reason: "user_reject|max_iterations|stagnation", terminatedAt: "..." }
```

### State 기록 방법
```bash
mkdir -p .aing/state && printf '%s' '{"active":true,"phase":"foundation","feature":"...","startedAt":"...","iteration":0}' > .aing/state/plan-state.json
```

### State 복원 (세션 재개)
세션 시작 시 `.aing/state/plan-state.json`을 읽는다:
- `active: true` + `phase: "steelman"` → Phase 3부터 재개. 사용자에게 재개 확인:
  ```
  이전 세션에서 "{feature}" 계획이 Phase {N}({phase})에서 중단되었습니다.
  재개할까요? (y/n)
  ```
- `active: false` → 새 플래닝 시작
- 파일 없음 또는 파싱 실패 → 새 플래닝 시작

### State Integrity Check (Critic이 수행)
Critic Phase 6에서 state 파일을 읽어 검증:
- phase 전환 이력이 연속적인가? (gate → foundation → option-design → steelman → synthesis → synthesis-check → critique)
- iteration 카운트가 일치하는가?
- 비정상이면 MINOR finding으로 보고 (state 관리 개선 필요)

---

## Phase 1: Ryan — Foundation (ALL levels)

Ryan(opus)이 **Options 없이** Constraints와 Preferences를 도출한다.

**왜 분리하는가**: Able이 원칙과 옵션을 동시에 만들면, 원칙이 결론을 정당화하는 방향으로 편향된다.
Ryan은 코드베이스를 읽고 제약/선호를 확정한 뒤, 그 결과를 Able에게 넘긴다.

출력: **FOUNDATION** format
- **Constraints** (불변): 위반 시 플랜 무효. 각각 Source + Evidence + Violation Impact
- **Preferences** (가변): 트레이드오프 가능. 각각 Priority + Tradeoff Threshold + Why
- **Context Summary**: 의사결정에 필요한 코드베이스 사실

→ 에이전트: `aing:ryan` (opus), read-only
→ State: `phase: "foundation"`

## Phase 2: Able — Option Design (ALL levels)

Able(opus)이 Ryan의 FOUNDATION 기반으로 AING-DR Draft를 생성한다.

### Complexity Scoring

| Signal | Score |
|--------|-------|
| fileCount: ≤2→0, ≤5→1, ≤15→2, >15→3 |
| domainCount: 1→0, 2→2, 3→3, >3→4 |
| hasArchChange: +2 |
| hasSecurity: +2 |

| Level | Score |
|-------|-------|
| **low** | ≤ 3 |
| **mid** | 4-7 |
| **high** | > 7 |

### DR 깊이 분화

**DR Lite (low)**: Constraints 요약 + Drivers 1개 + Options 2개 + Rejection Reason.
**DR Standard (mid)**: Full AING-DR. Constraints/Preferences 반영. Drivers 3개(가변). Constraint 충족 여부 명시.
**DR Deep (high/deliberate)**: Standard + Pre-mortem 3개 + Rollback Plan + Expanded Test Plan.

→ 에이전트: `aing:able` (opus)
→ State: `phase: "option-design"`

### Interactive User Review Point 1 (`--interactive` only)

**AskUserQuestion**으로 초안을 사용자에게 제시:

```
AING-DR 초안이 완성되었습니다.

Constraints: {N}개
Drivers: {top 3}
Options: {N}개 → 추천: {name}

선택:
1. 리뷰 진행 (Klay steelman → Peter → Critic)
2. 수정 요청 (피드백 후 재작성)
3. 리뷰 스킵 (ADR 생성 후 바로 저장)
```

`--interactive` 없으면 자동으로 리뷰 진행.

## Phase 3: Klay — Steelman Deliberation (ALL levels)

Klay(opus)가 모든 플랜에 대해 STEELMAN_REVIEW를 수행:

1. **Feasibility**: 각 step의 실현 가능성 (file:line)
2. **Steelman Antithesis**: 추천 옵션을 뒤집을 수 있는 가장 강력한 반론 (필수)
3. **Tradeoff Tension**: 무시 불가능한 트레이드오프 (최소 1개)
4. **Constraint-Option Consistency**: 추천 옵션이 Ryan의 Constraints를 모두 충족하는지
5. **New Driver Proposal**: 리뷰에서 발견된 새로운 Decision Driver 제안 (가변 Drivers)
6. **Synthesis Path**: 경쟁 옵션의 장점을 결합하는 제3의 경로 (가능한 경우)

→ 에이전트: `aing:klay` (opus), `[PLAN REVIEW MODE]`
→ State: `phase: "steelman"`

## Phase 4: Able — Synthesis (ALL levels)

Able(opus)이 Klay의 STEELMAN_REVIEW를 받아 플랜을 수정:

1. 각 반론에 대해 **명시적 대응** (수용 또는 반박 근거)
2. Klay가 제안한 새 Driver를 Drivers 목록에 반영 (또는 거부 근거)
3. Rejection Evidence 강화

→ 에이전트: `aing:able` (opus)
→ State: `phase: "synthesis"`

## Phase 5: Peter — Synthesis Verification (ALL levels)

Peter(sonnet)가 Able의 synthesis 품질을 검증:

1. **Steelman Reflection Audit**: ABSORBED/REBUTTED/ACKNOWLEDGED/IGNORED
2. **Driver Changes Tracking**: 초기→현재 변경 이력
3. **Delta Score** (iteration 2+): 이전 대비 진전 측정

Verdict: **PASS** / **REVISE**
- IGNORED 1개 → 자동 REVISE → Phase 4로 복귀
- REVISE 시 무엇을 반영해야 하는지 명시

→ 에이전트: `aing:peter` (sonnet), read-only
→ State: `phase: "synthesis-check"`

## Phase 6: Critic — 5-Phase Deliberation Critique (ALL levels)

**Peter PASS 후에만 실행** (sequential).

Critic(opus)이 5-Phase 프로토콜로 심의 품질을 비평:

1. **Pre-commitment**: 플랜 읽기 전 잠재 문제 3-5개 예측
2. **Verification**: Constraint Compliance, Alternative Fairness, Criteria Testability, Risk Clarity, Pre-mortem/Rollback Quality
3. **Multi-perspective**: Executor / Stakeholder / Skeptic 3자 관점
4. **Gap Analysis + Self-audit**: 누락 식별 + 자기 발견 검증 (과잉 판정 방지)
5. **Synthesis**: Pre-commitment 예측 vs 실제 발견 비교

**Adaptive Harshness**:
- low/mid: THOROUGH mode (기본)
- high/deliberate: CRITICAL 1개 또는 MAJOR 3개+ → ADVERSARIAL mode 에스컬레이션

Verdict: **APPROVE** / **ITERATE** / **REJECT**
- APPROVE: Constraints 충족, CRITICAL 0개, MAJOR 0개 (confirmed)
- ITERATE: CRITICAL 0개, MAJOR 1-2개 (수정 가능) → Phase 2로 복귀
- REJECT: Constraint 위반 (자동) / CRITICAL 1개+ / MAJOR 3개+ (시스템적) → 중단

→ 에이전트: `aing:critic` (opus)
→ State: `phase: "critique"`

## Consensus Loop (ALL levels)

**Critic ITERATE 또는 Peter REVISE 시:**

```
Peter REVISE → Phase 4 (Able 재synthesis) → Phase 5 (Peter 재검증)
Critic ITERATE → Phase 2 (Able 재설계) → Phase 3~6 전체 반복
```

| Level | 최대 반복 |
|-------|----------|
| low | 3회 |
| mid / high / deliberate | 5회 |

**조기 종료**: Peter의 Delta Score가 2연속 ≤ 0 → 최선 버전으로 진행 + Confidence: LOW

**최대 반복 초과 시**: 최선 버전을 사용자에게 제시 + "전문가 합의 미도달" 표시 + Confidence: LOW

→ State: `iteration: N` (매 루프마다 증가)

### Interactive User Review Point 2 (`--interactive` only)

Critic APPROVE 후, **AskUserQuestion**으로 최종 승인:

```
AING-DR 합의 완료. Confidence: {HIGH/MED/LOW}

Constraints: {N}개 (all honored ✓)
Steelman: {Klay 핵심 반론 1줄}
Peter: {ABSORBED N / REBUTTED N}
Critic: APPROVE ({THOROUGH/ADVERSARIAL} mode)

선택:
1. 승인 → /aing team (추천: verify→fix 루프)
2. 승인 → /aing auto (빠르게)
3. 수정 요청 (Phase 2로 복귀)
4. 거부 (플랜 폐기)
5. 저장만 (나중에 실행)
```

`--interactive` 없으면 자동으로 Phase 7 진행 + Next Action Selection 표시.

## Phase 7: Able — Living ADR + Persist

### Living ADR 생성 (모든 플랜에 포함)

**ADR Lite (low)**:
```
Decision / Confidence / Why Chosen / Rejected Alternative + Reason
```

**Living ADR (mid+)**:
```
## ADR — Architecture Decision Record
### Decision: {선택된 옵션}
### Confidence: {Peter 판정 — HIGH / MED / LOW}
### Constraints Honored:
  - C1 {name}: ✓ — {충족 증거}
  - C2 {name}: ✓ — {충족 증거}
### Drivers (Initial → Final):
  - [unchanged] {driver 1}
  - [added by Klay] {driver 2} — source: STEELMAN_REVIEW
  - [modified] {driver 3}: "{before}" → "{after}"
### Alternatives Rejected:
  - {Option B}: violates Constraint C{N} — evidence: {file:line}
  - {Option C}: conflicts with Driver #{N} — {근거}
### Steelman & Response:
  - Antithesis: {Klay 반론}
  - Response: {Able 대응}
  - Peter Verification: {ABSORBED/REBUTTED} — {근거}
### Critic Assessment:
  - Mode: {THOROUGH/ADVERSARIAL}
  - Findings: {CRITICAL 0, MAJOR 0, MINOR N}
  - Self-audit: {N}건 다운그레이드
### Consequences: {긍정/부정}
### Rollback Plan (deep only): {되돌리는 구체적 방법}
### Follow-ups: {후속 작업, 보류된 결정}
```

→ State: `phase: "adr"` → 완료 후 `active: false`

### Persist

```bash
printf '%s' '{FINAL_PLAN_JSON}' | node "${CLAUDE_PLUGIN_ROOT}/dist/scripts/cli/persist.js" plan --stdin --dir "$(pwd)"
```

`--dir "$(pwd)"` **mandatory**. `printf '%s'` 사용 (echo가 아닌).
Creates: `.aing/plans/{date}-{feature}.md` + `.aing/tasks/task-{id}.json`

## Plan Summary Display

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  aing plan: {feature}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Plan: .aing/plans/{date}-{feature}.md
  Tasks: {N}개
  Team: {preset} ({agent names})
  Complexity: {level} ({score}/15)
  Confidence: {HIGH/MED/LOW}
  Iterations: {N}회

  ── AING-DR ────────────────────────────
  Constraints: {N}개 (all honored ✓)
  Preferences: {N}개
  Drivers: {initial N} → {final N} ({changes}개 변경)
  Options: {N}개 → Recommended: {name}
  Steelman: {Klay 핵심 반론 1줄}
  Peter: {ABSORBED {n} / REBUTTED {n}}
  Critic: {THOROUGH/ADVERSARIAL} — {CRITICAL 0, MAJOR 0, MINOR N}
  ADR: ✓ Living ADR 생성됨

  {if high/deliberate}
  Pre-mortem: {3개 실패 시나리오 제목}
  Rollback: ✓ 복구 계획 포함
  {endif}

  Task Breakdown:
  #1  {task title}          → {agent}
  #2  {task title}          → {agent}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Next Action Selection (non-interactive mode)

**MANDATORY**: AskUserQuestion:

1. **/aing team** — 팀 실행 (추천: verify→fix 루프, 품질 보장)
2. **/aing auto** — 단발 실행 (빠르게, verify 없이)
3. **저장만** — 계획만 저장하고 나중에 실행

- Option 1 → `/aing team --plan .aing/plans/{date}-{feature}.md`
- Option 2 → `/aing auto` with plan context
- Option 3 → Confirm save and end

## Error Handling

- Ryan 실패 → Able이 자체적으로 Constraints 도출 (graceful degradation)
- Klay 실패 → skip steelman, Able draft 직접 저장
- Peter 실패 → Klay review만으로 진행 (synthesis 미검증 경고 + Confidence: LOW)
- Critic 실패 → Peter review만으로 진행 (심의 미비평 경고 + Confidence: LOW)
- Consensus loop 최대 반복 초과 → 최선 버전 + Confidence: LOW
- Delta Score 2연속 정체 → 조기 종료 + 정체 사유 표시
- State 파일 손상 → 새 플래닝 시작 (state 초기화)
- persist.js stdin 실패 → CLI arg 모드 fallback
