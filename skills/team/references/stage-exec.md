# Stage 2: team-exec (= PDCA Do)

## Step 2-1: Create Team
```
TeamCreate({
  team_name: "<feature-slug>",
  description: "aing team: <task>"
})
```

## Step 2-2: Announce Agent Deployment

**MANDATORY**: 에이전트 투입 전 반드시 표시:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  aing team: 에이전트 투입
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Agent        Role              Model    Task
  ─────        ────              ─────    ────
  Jay          Backend / API     sonnet   API 엔드포인트 구현
  Derek        Frontend / Build  sonnet   UI 컴포넌트 구현
  (verify 대기: Milla + Sam)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Stage-Aware Agent Selection

| Stage | Default Agents | Specialist Routing |
|-------|---------------|-------------------|
| team-plan | Able (plan), Klay (review) | + Milla for high-complexity gap analysis |
| team-exec | Jay (backend), Derek (frontend) | + Jerry (DB), Willji (design) based on task keywords |
| team-verify | Milla (security), Sam (CTO) | + Klay (quality) for mid+, + Jun (performance) for high |
| team-fix | Jay (primary fixer) | + debugger routing if same error 3x |

Keyword-based specialist routing for team-exec:
- "database", "schema", "migration" → include Jerry
- "UI", "component", "page", "design" → include Derek + Willji
- "API", "endpoint", "backend" → include Jay
- "auth", "security" → include Milla as advisor

team-verify uses the same complexity-based review scaling as `/aing review`:
- low: Milla only
- mid: Milla + Klay
- high: Milla + Klay + Jay (performance)

## Step 2-3: Task-Level Execution with Gate Review

**하네스 엔지니어링 원칙**: 각 task 완료마다 자동 review gate를 통과해야 다음 task로 진행합니다. "리뷰할까요?"라고 묻지 않습니다. **무조건 실행**합니다.

**실행 패턴: Task → TDD → Review Gate → Next Task**

```
Task #1 exec → TDD 확인 → Milla mini-review → PASS → Task #2 exec → ...
                                              → FAIL → 즉시 fix → re-review → Task #2 exec → ...
```

### 독립 task는 병렬, 의존 task는 순차+게이트

1. **의존성 분석**: plan의 steps에서 의존 관계 파악
2. **독립 task 그룹**: 동시 실행 가능 → 병렬 스폰
3. **의존 task**: 선행 task 완료 + review gate 통과 후 실행

### Worker Spawn

**MANDATORY: `description` 파라미터로 에이전트 가시성을 확보합니다.**

`description` 포맷: `"{Name}: {구체적 작업 요약}"` (3-5 단어)

```
Agent({
  subagent_type: "aing:{name}",
  description: "{Name}: {구체적 작업 요약}",
  team_name: "<feature-slug>",
  name: "{name}",
  model: "{agent's default model}",
  prompt: "... (auto/SKILL.md Worker Prompt Template 참조) ..."
})
```

각 워커 프롬프트에 반드시 포함:
1. Entrance banner (agents/*.md에서)
2. 구체적 태스크
3. TDD 강제 규칙 (테스트 먼저 작성 → 실패 확인 → 구현 → 통과 확인)
4. 증거 수집 요구사항
5. `@{Name}❯` 프리픽스 커뮤니케이션 포맷
6. SendMessage to "team-lead" on completion

## Step 2-4: Review Gate (Task 완료마다 자동 실행)

**MANDATORY — 묻지 않고 실행합니다.**

각 exec task가 완료되면 즉시 Milla mini-review를 실행합니다:

```
Agent({
  subagent_type: "aing:milla",
  description: "Milla: Task #{N} gate review",
  model: "haiku",   ← task-level gate는 haiku로 빠르게
  prompt: "[GATE REVIEW]
Task #{N} '{task_title}' 완료 후 gate review입니다.

수행:
1. 변경된 파일의 git diff 확인
2. 컴파일/타입 에러 확인 (build or tsc)
3. 관련 테스트 실행 및 통과 확인
4. 명백한 보안 이슈 확인

출력:
## Gate Review: Task #{N}
- Build: PASS/FAIL
- Tests: PASS/FAIL ({N}/{N})
- Security: PASS/CONCERN
- Verdict: GATE_PASS / GATE_FAIL — {사유}

Rules:
- 이것은 경량 게이트입니다. 전체 리뷰가 아닌 통과/차단 판정만.
- GATE_FAIL 시 구체적 수정 필요 사항 1-3개만 명시.
- 코딩 스타일, 네이밍 등 minor 이슈는 GATE_PASS + 메모로 처리."
})
```

### Gate 결과 처리

| Verdict | Action |
|---------|--------|
| GATE_PASS | 다음 task 진행 (또는 모든 task 완료 시 team-verify) |
| GATE_FAIL | 담당 에이전트 즉시 재스폰 → fix → re-gate (최대 2회) |

Gate fail fix:
```
Agent({
  subagent_type: "aing:{original_agent}",
  description: "{Name}: Gate fix — {failure reason}",
  model: "{original model}",
  prompt: "[GATE FIX]
Gate review에서 다음 이슈가 발견되었습니다:
{Milla's GATE_FAIL details}

즉시 수정하고 테스트를 다시 실행하세요.
수정 후 SendMessage로 완료를 알리세요."
})
```

## Step 2-5: Monitor with Live Progress

**상태 전환 시** (시작, 완료, gate 통과, gate 실패):
```
┌──────────┬───────────────────────────┬───────────────────────┐
│   워커   │          태스크           │         상태          │
├──────────┼───────────────────────────┼───────────────────────┤
│ Jay      │ #1 Backend API            │ ✅ done → 🔍 gate ✓   │
├──────────┼───────────────────────────┼───────────────────────┤
│ Derek    │ #2 Frontend UI            │ 🔄 실행 중            │
├──────────┼───────────────────────────┼───────────────────────┤
│ Jay      │ #3 Integration            │ ⏳ gate #2 대기       │
└──────────┴───────────────────────────┴───────────────────────┘
```

## 전환 조건 → team-verify
- 모든 exec task가 `completed` + `GATE_PASS`
- gate fail이 2회 이상 반복되면 team-verify로 escalate (전체 검증)
