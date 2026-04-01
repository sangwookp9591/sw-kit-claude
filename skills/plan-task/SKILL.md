---
name: plan-task
description: "📋 AING-DR 6자 합의 계획. Ryan(원칙) → Able(설계) → Klay(반론) → Peter(검증) → Critic(비평) → Persist. 상태 관리 + Interactive + Living ADR."
triggers: ["plan", "계획", "기획", "설계"]
---

<!-- aing preamble T3 -->
Agents: Simon(CEO/전략), Sam(CTO/검증), Able(계획), Klay(탐색/리뷰), Milla(보안/검증), Jay(백엔드), Jerry(DB/인프라), Derek(모바일), Iron(프론트엔드), Rowan(모션), Willji(디자인), Jun(성능), Kain(코드분석/LSP)

Commands: /aing plan, /aing auto, /aing team, /aing explore, /aing review, /aing task, /aing debug, /aing test, /aing refactor, /aing do

Voice Directive:
- 간결하고 기술적으로 답변. 추측 대신 코드를 읽고 확인.
- 한국어로 응답하되 기술 용어는 영어 유지.
- 결과물에 근거(파일 경로, 라인 번호) 첨부.

AskUserQuestion Format:
선택이 필요하면 다음 포맷으로 질문:
1. {Option A} — {설명}
2. {Option B} — {설명}
3. {Option C} — {설명}

Completeness Score:
작업 완료 시 완성도를 0-100%로 자가 평가. 90% 미만이면 누락 항목 명시.

Search Before Building (3-Layer):
1. Glob/Grep으로 기존 구현 검색
2. 패턴/컨벤션 파악 후 일관성 유지
3. 중복 생성 방지 — 기존 코드 재사용 우선

Team Routing:
| Complexity | Agent Team              | Model   |
|------------|-------------------------|---------|
| low (≤3)   | Derek solo              | haiku   |
| mid (4-7)  | Derek + Klay review     | sonnet  |
| high (>7)  | Full team + Milla gate  | opus    |
<!-- /preamble -->

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

## Agent Roles (역할 분담) — 적응적 모델 라우팅

에이전트 모델은 complexity level에 따라 자동 결정된다.

| Agent | Role | low (≤3) | mid (4-7) | high (>7) | 핵심 책임 | Tool Call 상한 | Timeout |
|-------|------|----------|-----------|-----------|----------|---------------|---------|
| **Explore** | Context Scanner | haiku | haiku | haiku | 코드베이스 구조 스캔 → context snapshot | 20 | 30초 (soft) / 60초 (hard) |
| **Ryan** | Deliberation Facilitator | haiku | sonnet | sonnet | Constraints/Preferences 도출. **Options 없이** 원칙 확정 | 5 (fallback: 10) | 90초 |
| **Able** | PM / Planner | sonnet | opus | opus | Options 설계, Steps 분해, Living ADR 생성 | 5 | 3분 |
| **Klay** | Architect / Steelman | sonnet | opus | opus | 반론(antithesis), 트레이드오프, 원칙-옵션 정합성, 새 Driver 제안 | 15 | 3분 |
| **Peter** | Synthesis Verifier | — (스킵) | sonnet (조건부) | sonnet | 반론 반영 검증, Delta Score, Confidence Level | 3 | 1분 |
| **Critic** | Deliberation Critic | sonnet | sonnet | opus | 심의 품질 비평 (문서 기반 + high만 spot-check) | 5 (high: 10) | 2분 (high: 3분) |

**Critic 역할 재정의**: Critic은 이전 에이전트 출력물의 **논리적 일관성만** 검증한다.
코드 사실은 Klay/Explore가 이미 확인했으므로 Critic이 재확인할 필요 없다.
high에서만 spot-check 허용 (의심스러운 claim 2-3개만 직접 확인).

**Milla는 plan-task에 참여하지 않는다** — 보안 전문가 본연의 역할에 집중. 심의 품질은 전용 Critic이 담당.

**Timeout 시 처리**:
- 불완전 출력 → JSON 파싱 시도 → 성공: 부분 결과 사용 + Confidence 1단계 하락
- JSON 파싱 실패 → 해당 Phase 재시도 1회 (timeout +30초)
- 재실패 → Phase 스킵 + Confidence 2단계 하락

## Pipeline Overview

```
Phase 0: Gate (모호 요청 차단)
  ↓ PASS
Phase 0.5: Explore(haiku, 30초) → context snapshot + Complexity 1단계 측정
  ↓
Phase 1: Ryan ← context 주입 + Complexity 2단계 재평가
  ↓ level 확정 → 경로 분기
  ↓
      ┌────┴──────────────┬──────────────────┐
     low                  mid                high
      │                   │                  │
  Phase 2: Able(sonnet)   Able(opus)         Able(opus)
      │                   │                  │
  Phase 3: Klay(sonnet)   Klay(opus)         Klay(opus)
      │                   │                  │
      │               반론≥2?             Phase 4: Able synthesis
      │               no→skip             Phase 5: Peter
      │               yes→Phase 4,5          │
      │                   │                  │
  Phase 6: Critic      Critic(sonnet)     Critic(opus)
   (sonnet,문서기반)    (문서+spot-check)   (문서+spot-check)
      │                   │                  │
  Phase 7: ADR          ADR                ADR
      │                   │                  │
    ~4분                ~10분              ~15분
```

**판정 우선순위** (명시적):
1. Critic REJECT → 중단 (terminal)
2. Peter REVISE → Phase 4 복귀 (inner loop)
3. Critic ITERATE → Phase 2 복귀 (outer loop)
4. Peter PASS + Critic APPROVE → Phase 7 진행

## 복잡도별 실행 경로 (적응적 품질)

| Level | Score | Explore | Ryan | Able | Klay | Peter | Critic | Pre-mortem | Rollback | 합의 루프 |
|-------|-------|---------|------|------|------|-------|--------|------------|----------|----------|
| **low** | ≤ 3 | haiku 30s | haiku | sonnet DR Lite | sonnet lite | — 스킵 | sonnet THOROUGH (문서기반, tool 0) | — | — | 최대 2회 |
| **mid** | 4-7 | haiku 30s | sonnet | opus DR Standard | opus | sonnet (반론 2+개만) | sonnet (문서+spot-check, tool ≤5) | — | — | 최대 3회 |
| **high** | > 7 | haiku 30s | sonnet | opus DR Deep | opus | sonnet (필수) | opus (문서+spot-check, tool ≤10) | ✓ 필수 | ✓ 필수 | 최대 5회 |
| **`--deliberate`** | any | haiku 30s | sonnet | opus DR Deep | opus | sonnet (필수) | opus (문서+spot-check, tool ≤10) | ✓ 필수 | ✓ 필수 | 최대 5회 |

**적응적 정책**: 복잡도에 따라 에이전트 참여와 모델이 달라진다. Low에서는 Peter 스킵 + 경량 파이프라인.
**자동 `--deliberate` 트리거**: hasSecurity=true 또는 hasArchChange=true이고 score > 5

### Complexity 2단계 재평가

**1단계 (Phase 0.5)**: 정적 시그널 — fileCount + domainCount + hasArchChange + hasSecurity = score
**2단계 (Phase 1 후)**: Ryan Constraints에서 동적 재평가:
- Constraint에 "auth", "payment", "migration", "encryption" → +2
- Constraint에 "external API", "third-party" → +1
- Constraint 5개 이상 → +1

재평가 결과 level이 상승하면:
- low → mid: **현재 Phase부터** mid 모델로 전환 (이미 완료된 Phase 재실행 안 함)
- mid → high: Able을 opus로 전환 + Critic을 opus로 전환 + pre-mortem/rollback 활성화

**Klay complexityOverride**: Klay가 steelman 중 "이건 high여야 한다"고 판단하면 `complexityOverride: "high"` 신호.
오케스트레이터가 수용 시 남은 Phase 에스컬레이션. (수용 기준: Klay가 file:line 증거와 함께 에스컬레이션 근거를 제시한 경우)

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

Phase 0.5 시작:
  READ state → 확인 → state.phase = "explore"

Phase 1 시작:
  READ state → 확인 → state.phase = "foundation"
  + Complexity 2단계 재평가 → state.complexityLevel = "low|mid|high"

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
- phase 전환 이력이 연속적인가? (gate → explore → foundation → option-design → steelman → synthesis → synthesis-check → critique)
- iteration 카운트가 일치하는가?
- 비정상이면 MINOR finding으로 보고 (state 관리 개선 필요)

---

## Phase 0.5: Explore — Context-First Architecture

Explore(haiku)가 코드베이스를 스캔하여 context snapshot을 생성한다.
**모든 후속 에이전트에 동일 context를 주입**하여 개별 탐색 시간을 제거한다.

**Explore ∥ Ryan 병렬은 하지 않는다**: Ryan은 Explore 결과에 soft-depend하므로 병렬 시 타이밍 불일치 발생.
Explore를 haiku + 30초 timeout으로 충분히 빠르게 만들어서 순차 실행해도 overhead 최소화.

**캐시 전략**: `.aing/context/{domain}.md`
- 캐시 히트 조건: 동일 도메인 + 파일 변경 없음 (git status clean) + 캐시 age < 24시간
- 캐시 히트 시: Explore 스킵 → 즉시 Phase 1 진입 (~30초 절감)
- 캐시 미스 시: Explore 실행 → 결과를 `.aing/context/`에 저장

```
# 캐시 확인
# 1. .aing/context/{도메인}.md 존재 + 24시간 이내 + git status clean → 캐시 히트 → Phase 1
# 2. 캐시 미스 → Explore 스폰

Agent({
  subagent_type: "Explore",
  description: "Explore: context 수집 — {feature}",
  model: "haiku",
  prompt: "{task}에 관련된 코드베이스를 스캔하세요.

탐색 수준: medium
다음을 파악하세요:
1. 관련 파일 목록 + 디렉토리 구조
2. 핵심 인터페이스/타입 정의
3. 기존 패턴/컨벤션
4. 의존성 관계

결과를 .aing/context/{도메인}.md에 캐시하세요."
})
```

**Explore 실패 시**: Ryan에게 "자체 탐색 허용 (max 10 tool calls)" fallback. Confidence에는 영향 없음.

→ State: `phase: "explore"` → Complexity 1단계 측정 (정적 시그널)

## Phase 1: Ryan — Foundation (ALL levels)

Ryan이 **Options 없이** Constraints와 Preferences를 도출한다. 모델은 complexity level에 따라 결정 (low: haiku, mid/high: sonnet).

**왜 분리하는가**: Able이 원칙과 옵션을 동시에 만들면, 원칙이 결론을 정당화하는 방향으로 편향된다.
Ryan은 제약/선호를 확정한 뒤, 그 결과를 Able에게 넘긴다.

**Context-First**: Explore의 context snapshot이 프롬프트에 주입된다. Ryan은 자체 탐색을 최소화한다.

```
Agent({
  subagent_type: "aing:ryan",
  description: "Ryan: 원칙 도출 — {feature}",
  model: "{low: haiku, mid/high: sonnet}",
  prompt: "다음 작업에 대한 Constraints와 Preferences를 도출하세요: {task}

## Explore Context Snapshot
{Explore 에이전트가 수집한 코드베이스 컨텍스트 — 파일 구조, 핵심 코드, 패턴}

위 컨텍스트를 기반으로 **추가 탐색 없이** 원칙을 도출하세요.
컨텍스트가 부족한 경우에만 최소한의 Glob/Grep을 수행하세요 (tool call 5회 이내, Explore 실패 시 10회).

FOUNDATION 포맷으로 출력:
## Constraints (불변 — 위반 시 플랜 무효)
### C1: {name}
- Source: {어디서 온 제약인가}
- Evidence: {file:line 또는 문서}
- Violation Impact: {위반 시 결과}

## Preferences (가변 — 트레이드오프 가능)
### P1: {name}
- Priority: HIGH/MED/LOW
- Tradeoff Threshold: {어디까지 양보 가능}
- Why: {이유}

## Context Summary
{의사결정에 필요한 코드베이스 사실}

Rules:
- Options나 Solutions를 제안하지 마세요 — 원칙만 세웁니다
- Evidence 없는 Constraint는 Preference로 강등하세요
- 탐색 결과를 .aing/context/{도메인}.md 에 캐시하세요 (다음 호출에서 재사용)"
})
```

→ State: `phase: "foundation"`

## Phase 2: Able — Option Design (ALL levels)

Able이 Ryan의 FOUNDATION 기반으로 AING-DR Draft를 생성한다. 모델: low=sonnet, mid/high=opus.

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

```
Agent({
  subagent_type: "aing:able",
  description: "Able: AING-DR 설계 — {feature}",
  model: "{low: sonnet, mid/high: opus}",
  prompt: "Ryan의 FOUNDATION을 기반으로 AING-DR Draft를 생성하세요.

=== RYAN FOUNDATION ===
{Ryan's output}

=== TASK ===
{task description}

=== COMPLEXITY LEVEL ===
{low|mid|high}

PLAN_DRAFT 포맷으로 출력 (complexity level에 따라 깊이 조절):
## Meta
- Feature: {name}
- Complexity Signals: fileCount={N}, domainCount={N}, hasArchChange={bool}, hasSecurity={bool}
- Complexity Score: {N}/15
- Complexity Level: {low|mid|high}

## Constraints Honored (Ryan의 Constraints 인용)
- C1 {name}: ✓ 충족 방법 / ✗ 불가능 사유

## Decision Drivers (mid+: 3개, low: 1개)
1. {driver}

## Options
### Option A: {name}
- Constraint Compliance: {C1: ✓, C2: ✓}  (mid+)
- Pros: {list}
- Cons: {list}
### Option B: {name}
- Constraint Compliance: {C1: ✓, C2: ✗ — reason}
- Pros: {list}
- Cons: {list}

## Recommended: {name}
Rejection Evidence: {왜 다른 옵션이 탈락했는지}

## Steps
1. {step} — files: {paths}, completeness: {X}/10

## Acceptance Criteria
- [ ] {testable criterion}

## Risks
- {risk}: {mitigation}

{high/deliberate only:}
## Pre-mortem
1. {실패 시나리오}: {원인} → {대응}

## Rollback Plan
{되돌리는 구체적 방법}

Rules:
- 최소 2개 Options 비교
- 모든 Step에 파일 경로 명시
- Constraint 위반 Option은 반드시 탈락 사유 기술
- Evidence는 file:line 형태"
})
```

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

Klay가 모든 플랜에 대해 STEELMAN_REVIEW를 수행. 모델: low=sonnet, mid/high=opus.

**antithesis=0 검증 (rubber stamp 구조적 차단)**:
Klay APPROVE + antithesis 0개 = **INVALID**. 오케스트레이터가 REJECT → Phase 3 재실행 (1회만).
antithesis 없는 APPROVE는 검토를 하지 않은 것과 같다.

```
Agent({
  subagent_type: "aing:klay",
  description: "Klay: steelman 리뷰 — {feature}",
  model: "{low: sonnet, mid/high: opus}",
  prompt: "[PLAN REVIEW MODE]
다음 AING-DR Draft의 steelman 리뷰를 수행하세요.

=== RYAN FOUNDATION ===
{Ryan's output}

=== ABLE PLAN_DRAFT ===
{Able's output}

STEELMAN_REVIEW 포맷으로 출력:
## Feasibility
- Step {N}: FEASIBLE / CONCERN — {detail, file:line}

## Steelman Antithesis (필수)
추천 옵션을 뒤집을 수 있는 가장 강력한 반론:
{antithesis}

## Tradeoff Tension (최소 1개)
- {tension}: {detail}

## Constraint-Option Consistency (mid+)
| Constraint | Option A | Option B |
|-----------|----------|----------|
| C1 | ✓ | ✗ — {reason} |

## New Driver Proposal
- {new driver}: {why this matters}

## Synthesis Path (optional)
{경쟁 옵션의 장점을 결합하는 제3의 경로}

## Missing Constraints (신규 — Ryan이 놓친 제약 발견 시)
- MC1: {name} — Evidence: {file:line}

## Architecture Risks
- {risk}: severity={HIGH/MED/LOW}, {detail}

## Complexity Override (optional)
{이 작업이 현재 level보다 높아야 한다고 판단하면}
complexityOverride: {high} — Reason: {file:line 증거}

## Verdict
APPROVE / SUGGEST_CHANGES

Rules:
- Steelman Antithesis와 최소 1개 Tradeoff Tension은 필수
- **antithesis 없는 APPROVE = INVALID** (rubber stamp 구조적 차단)
- 코드베이스를 직접 탐색하여 file:line 증거 제시
- Constraint-Option Consistency 테이블은 mid+ 필수
- Missing Constraints 발견 시 반드시 MC 섹션에 기록"
})
```

→ State: `phase: "steelman"`

### Post-Phase 3: 오케스트레이터 처리

**1. antithesis=0 검증**:
Klay APPROVE + antithesis 0개 → INVALID → Phase 3 재실행 (1회만, "antithesis 필수" 강조).
재실행 후에도 antithesis 0개 → 경고 + 진행 (Confidence 1단계 하락).

**2. Missing Constraints 복구**:
Klay가 MC (Missing Constraints)를 발견한 경우:
1. MC를 Ryan Foundation에 추가 (**Phase 1 재실행 안 함**)
2. MC를 Able synthesis 프롬프트에 주입
3. Peter가 MC 반영 여부도 검증
4. Critic finding에 "Late Constraint Discovery" MINOR 기록

**3. Complexity Override 처리**:
Klay가 `complexityOverride: "high"` 신호를 보낸 경우 (file:line 증거 포함):
- 오케스트레이터가 수용 → 남은 Phase 에스컬레이션 (모델 업그레이드 + pre-mortem/rollback 활성화)
- 이미 완료된 Phase는 유지

**4. 스킵 경로 결정** (Peter 참여 여부):
| Klay 결과 | Peter | Critic |
|-----------|-------|--------|
| APPROVE (반론 0개) — antithesis 검증 후 | 스킵 | **THOROUGH** (반론 없는 플랜이야말로 의심) |
| SUGGEST (반론 1개 minor) | 스킵 | OK |
| SUGGEST (반론 2+개 또는 major) | **필수** | OK |

## Phase 4: Able — Synthesis (low: 경량, mid/high: 표준)

Able이 Klay의 STEELMAN_REVIEW를 받아 플랜을 수정. 모델: low=sonnet, mid/high=opus.
**Low에서는 경량 synthesis** — Klay lite가 1-2개만 제안하므로 1줄 코멘트로 수용/반박 가능.

```
Agent({
  subagent_type: "aing:able",
  description: "Able: 반론 통합 — {feature}",
  model: "{low: sonnet, mid/high: opus}",
  prompt: "Klay의 steelman 반론을 통합하여 플랜을 수정하세요.

=== RYAN FOUNDATION ===
{Ryan's output}

=== ORIGINAL PLAN_DRAFT ===
{Able's Phase 2 output}

=== KLAY STEELMAN_REVIEW ===
{Klay's output}

각 반론에 대해 명시적으로 대응하세요:
1. 수용 (ABSORBED): 플랜에 반영하고 변경 내용 기술
2. 반박 (REBUTTED): 구체적 증거로 반박 근거 제시
3. Klay가 제안한 새 Driver를 Drivers 목록에 반영 (또는 거부 근거)

수정된 전체 PLAN_DRAFT를 다시 출력하세요.
변경된 부분은 [CHANGED] 태그로 표시.

Rules:
- 모든 Klay 반론에 명시적 대응 필수 (무시 금지)
- ABSORBED면 플랜이 실제로 변경되어야 함 (형식적 언급 금지)
- REBUTTED면 file:line 증거 필수"
})
```

→ State: `phase: "synthesis"`

## Phase 5: Peter — Synthesis Verification (조건부)

Peter(sonnet)가 Able의 synthesis 품질을 검증.
**Low: 스킵. Mid: Klay 반론 2+개일 때만. High: 필수.**

```
Agent({
  subagent_type: "aing:peter",
  description: "Peter: 합의 검증 — {feature}",
  model: "sonnet",
  prompt: "Able의 synthesis가 Klay의 steelman 반론을 실제로 반영했는지 검증하세요.

=== KLAY STEELMAN_REVIEW ===
{Klay's output}

=== ABLE SYNTHESIS (수정된 플랜) ===
{Able's Phase 4 output}

{iteration > 1인 경우:}
=== PREVIOUS SYNTHESIS ===
{이전 iteration의 Able output}

SYNTHESIS_CHECK 포맷으로 출력:
## Steelman Reflection Audit
| # | Klay Point | Able Response | Status |
|---|-----------|---------------|--------|
| 1 | {point} | {response} | ABSORBED/REBUTTED/ACKNOWLEDGED/IGNORED |

## Reflection Score
- ABSORBED: {N} ({percent}%)
- REBUTTED: {N} ({percent}%)
- ACKNOWLEDGED: {N} ({percent}%)
- IGNORED: {N} ({percent}%)

## Delta Score (iteration 2+)
{(Resolved - New Issues) / Total}

## Driver Changes
- [unchanged] {driver}
- [added by Klay] {driver}
- [modified] {driver}: {before} → {after}

## Verdict: PASS / REVISE
## Confidence: HIGH / MED / LOW

Rules:
- IGNORED 1개 → 자동 REVISE
- ACKNOWLEDGED (형식적 언급, 실질 변경 없음) ≠ ABSORBED
- REVISE 시 무엇을 반영해야 하는지 명시"
})
```

**Peter REVISE** → Phase 4로 복귀 (Able 재synthesis)
**Peter PASS** → Phase 6 진행

→ State: `phase: "synthesis-check"`

## Phase 6: Critic — 5-Phase Deliberation Critique (ALL levels)

**Peter PASS 후에만 실행** (sequential). Peter 스킵 시에도 실행.
모델: low/mid=sonnet, high=opus. **문서 기반 논리 일관성 검증** — 코드 사실은 Klay/Explore가 이미 확인.
high에서만 spot-check 허용 (tool call ≤10, 의심스러운 claim 2-3개만).

```
Agent({
  subagent_type: "aing:critic",
  description: "Critic: 심의 비평 — {feature}",
  model: "{low/mid: sonnet, high: opus}",
  prompt: "AING-DR 심의의 품질을 5-Phase 프로토콜로 비평하세요.

=== RYAN FOUNDATION ===
{Ryan's output}

=== ABLE FINAL PLAN ===
{Able's latest output}

=== KLAY STEELMAN_REVIEW ===
{Klay's output}

=== PETER SYNTHESIS_CHECK ===
{Peter's output}

=== STATE FILE ===
{.aing/state/plan-state.json 내용}

5-Phase 프로토콜:
1. Pre-commitment: 플랜 읽기 전 잠재 문제 3-5개 예측
2. Verification: Constraint Compliance, Alternative Fairness, Criteria Testability, Risk Clarity
3. Multi-perspective: Executor / Stakeholder / Skeptic 3자 관점
4. Gap Analysis + Self-audit: 누락 식별 + 자기 발견 검증
5. Synthesis: Pre-commitment 예측 vs 실제 발견 비교

CRITIC_VERDICT 포맷으로 출력:
## Constraint Compliance
| Constraint | Status | Evidence |
|-----------|--------|----------|

## Findings
| Severity | Area | Finding | Evidence |
|----------|------|---------|----------|
| CRITICAL/MAJOR/MINOR | {area} | {finding} | {file:line} |

## Quality Metrics
- Evidence Coverage: {N}% (claims citing file:line)
- Criteria Testability: {N}% (testable acceptance criteria)
- Constraint Compliance: {N}% (constraints honored)

## Self-audit
- {N}건 다운그레이드 (과잉 판정 → MINOR로 조정)

## Verdict: APPROVE / ITERATE / REJECT
- APPROVE: CRITICAL 0, MAJOR 0 (confirmed), Constraints 100%
- ITERATE: CRITICAL 0, MAJOR 1-2 (수정 가능) → Phase 2로 복귀
- REJECT: Constraint 위반 / CRITICAL 1+ / MAJOR 3+ → 중단

## Mode: THOROUGH / ADVERSARIAL

Rules:
- Adaptive Harshness: CRITICAL 1+ 또는 MAJOR 3+ → ADVERSARIAL 에스컬레이션
- 거짓 승인은 거짓 거부보다 10배 비싸다
- State 파일의 phase 연속성도 검증"
})
```

→ State: `phase: "critique"`

## Consensus Loop (ALL levels)

**Critic ITERATE 또는 Peter REVISE 시:**

```
Peter REVISE → Phase 4 (Able 재synthesis) → Phase 5 (Peter 재검증)
Critic ITERATE → Phase 2 (Able 재설계) → Phase 3~6 전체 반복
```

| Level | 최대 반복 |
|-------|----------|
| low | 2회 |
| mid | 3회 |
| high / deliberate | 5회 |

**조기 종료 (3가지 수렴 감지)**:
1. Peter의 Delta Score가 2연속 ≤ 0 → 최선 버전으로 진행 + Confidence: LOW
2. Critic findings가 2연속 동일 → **stagnation 감지** → 조기 종료 + Confidence: LOW
3. iteration N의 plan과 N-1의 plan diff가 cosmetic only → 조기 종료 + Confidence: LOW

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

### Living ADR 생성

Able이 최종 결과를 FINAL_PLAN JSON으로 생성:

```
Agent({
  subagent_type: "aing:able",
  description: "Able: Living ADR 생성 — {feature}",
  model: "sonnet",
  prompt: "모든 심의 결과를 종합하여 FINAL_PLAN JSON을 생성하세요.

=== RYAN FOUNDATION ===
{Ryan's output}

=== FINAL PLAN (Critic APPROVE된 버전) ===
{Able's latest output}

=== KLAY STEELMAN_REVIEW ===
{Klay's output}

=== PETER SYNTHESIS_CHECK ===
{Peter's output}

=== CRITIC VERDICT ===
{Critic's output}

다음 JSON 포맷으로 출력하세요:

\`\`\`json
{
  \"feature\": \"...\",
  \"goal\": \"...\",
  \"steps\": [\"...\"],
  \"acceptanceCriteria\": [\"...\"],
  \"risks\": [\"...\"],
  \"options\": [{ \"name\": \"...\", \"pros\": [\"...\"], \"cons\": [\"...\"] }],
  \"constraints\": [{ \"name\": \"...\", \"source\": \"...\", \"evidence\": \"...\", \"violationImpact\": \"...\" }],
  \"preferences\": [{ \"name\": \"...\", \"priority\": \"...\", \"tradeoffThreshold\": \"...\", \"why\": \"...\" }],
  \"drivers\": [{ \"name\": \"...\", \"status\": \"unchanged|added|modified\", \"source\": \"...\" }],
  \"steelman\": {
    \"antithesis\": \"...\",
    \"tradeoffs\": [\"...\"],
    \"newDrivers\": [\"...\"],
    \"synthesisPath\": \"...\"
  },
  \"peterVerdict\": {
    \"verdict\": \"PASS\",
    \"absorbed\": N,
    \"rebutted\": N,
    \"acknowledged\": N,
    \"ignored\": N,
    \"reflectionScore\": N,
    \"deltaScore\": N,
    \"confidence\": \"HIGH|MED|LOW\"
  },
  \"criticVerdict\": {
    \"verdict\": \"APPROVE\",
    \"mode\": \"THOROUGH|ADVERSARIAL\",
    \"critical\": N,
    \"major\": N,
    \"minor\": N,
    \"selfAuditDowngrades\": N,
    \"constraintCompliance\": \"N%\",
    \"criteriaTestability\": \"N%\",
    \"evidenceCoverage\": \"N%\"
  },
  \"adr\": {
    \"decision\": \"...\",
    \"confidence\": \"HIGH|MED|LOW\",
    \"constraintsHonored\": [\"C1: ✓ — ...\"],
    \"alternativesRejected\": [\"Option B: ... — ...\"],
    \"consequences\": { \"positive\": [\"...\"], \"negative\": [\"...\"] }
  },
  \"reviewNotes\": [
    { \"reviewer\": \"ryan\", \"verdict\": \"FOUNDATION\", \"highlights\": [\"...\"] },
    { \"reviewer\": \"klay\", \"verdict\": \"...\", \"highlights\": [\"...\"] },
    { \"reviewer\": \"peter\", \"verdict\": \"PASS\", \"highlights\": [\"...\"] },
    { \"reviewer\": \"critic\", \"verdict\": \"APPROVE\", \"highlights\": [\"...\"] }
  ],
  \"complexityScore\": N,
  \"complexityLevel\": \"low|mid|high\"
}
\`\`\`

Rules:
- 모든 필드를 빠짐없이 채우세요
- Evidence는 file:line 형태
- JSON은 반드시 유효해야 합니다"
})
```

### Persist

```bash
printf '%s' '{FINAL_PLAN_JSON}' | node "${CLAUDE_PLUGIN_ROOT}/dist/scripts/cli/persist.js" plan --stdin --dir "$(pwd)"
```

`--dir "$(pwd)"` **mandatory**. `printf '%s'` 사용 (echo가 아닌).
Creates: `.aing/plans/{date}-{feature}.md` + `.aing/tasks/task-{id}.json`

→ State: `phase: "adr"` → 완료 후 `active: false`

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
