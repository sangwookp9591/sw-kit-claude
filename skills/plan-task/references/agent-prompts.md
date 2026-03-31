# Plan Agent Prompts

## Able — Draft (Step 1)

```
Agent({
  subagent_type: "aing:able",
  description: "Able: 작업 계획 수립 — {task}",
  model: "sonnet",
  prompt: "다음 작업을 분석하고 PLAN_DRAFT 포맷으로 계획을 수립하세요: {task}

출력 포맷 (PLAN_DRAFT):
## Meta
- Feature: {name}
- Complexity Signals: fileCount={N}, domainCount={N}, hasArchChange={bool}, hasSecurity={bool}

## Goal
{what to achieve}

## Context
{codebase facts discovered by reading code}

## Options
### Option 1: {name}
- Pros: {list}
- Cons: {list}
### Option 2: {name}
- Pros: {list}
- Cons: {list}

## Recommended Option
{name} — {rationale}

## Steps
1. {step} — files: {paths}, agent: {name}
2. ...

## Acceptance Criteria
- [ ] {testable criterion}

## Risks
- {risk}: {mitigation}

Rules:
- 최소 2개 이상의 Options를 비교 분석 후 추천안 선택
- 모든 Step에 파일 경로와 담당 에이전트 명시
- Acceptance Criteria는 테스트 가능한 것만
- Meta 섹션의 Complexity Signals를 반드시 포함"
})
```

## Klay — Architecture Review (Step 2)

```
Agent({
  subagent_type: "aing:klay",
  description: "Klay: 계획 아키텍처 리뷰 — {feature}",
  model: "sonnet",
  prompt: "[PLAN REVIEW MODE]
다음 계획의 아키텍처 리뷰를 수행하세요.

{Able's PLAN_DRAFT output here}

REVIEW_FEEDBACK 포맷으로 출력하세요:
## Feasibility
- {step N}: FEASIBLE / CONCERN — {detail}

## Missing Alternatives
- {alternative not considered}

## Architecture Risks
- {risk}: severity={HIGH/MED/LOW}, {detail}

## Verdict
APPROVE / SUGGEST_CHANGES

## Changes Requested
- {specific change 1}
- {specific change 2}

Rules:
- 코드베이스를 직접 탐색하여 기술적 실현 가능성 검증
- 최소 1개의 누락된 대안 또는 아키텍처 리스크를 제시
- Rubber stamp 금지 — 실질적 피드백 필수"
})
```

## Milla — Gap Analysis (Step 2.5, high complexity only)

```
Agent({
  subagent_type: "aing:milla",
  description: "Milla: 계획 갭 분석 — {feature}",
  model: "sonnet",
  prompt: "[PLAN REVIEW MODE]
다음 계획과 아키텍처 리뷰를 분석하여 갭을 찾으세요.

=== PLAN_DRAFT ===
{Able's output}

=== REVIEW_FEEDBACK ===
{Klay's output}

CRITIC_FEEDBACK 포맷으로 출력하세요:
## Gap Analysis
| Severity | Area | Gap | Impact |
|----------|------|-----|--------|
| Critical/Major/Minor | {area} | {what's missing} | {consequence} |

## Acceptance Criteria Audit
- {criterion}: TESTABLE / NOT_TESTABLE — {fix suggestion}

## Dependency/Ordering Issues
- {issue}

## Verdict
APPROVE / REQUEST_CHANGES

## Changes Requested
- {specific change 1}
- {specific change 2}

Rules:
- Gap Analysis 테이블에 최소 1개 항목 필수
- Acceptance Criteria의 테스트 가능성을 각각 검증
- REQUEST_CHANGES 시 Changes Requested가 비어있으면 안 됨"
})
```

**Re-review loop**: Milla REQUEST_CHANGES → Able에게 피드백 전달 → 재리뷰. 최대 2회.

## Able — Feedback Integration (Step 3)

```
Agent({
  subagent_type: "aing:able",
  description: "Able: 피드백 통합 — {feature}",
  model: "sonnet",
  prompt: "다음 리뷰 피드백을 계획에 통합하고 FINAL_PLAN JSON을 생성하세요.

=== ORIGINAL PLAN ===
{Able's PLAN_DRAFT}

=== KLAY REVIEW ===
{Klay's REVIEW_FEEDBACK}

=== MILLA REVIEW (if present) ===
{Milla's CRITIC_FEEDBACK or 'N/A'}

리뷰어의 피드백을 반영하여 최종 계획을 수정하세요. 그리고 다음 JSON 포맷으로 출력하세요:

\`\`\`json
{
  \"feature\": \"...\",
  \"goal\": \"...\",
  \"steps\": [\"...\"],
  \"acceptanceCriteria\": [\"...\"],
  \"risks\": [\"...\"],
  \"options\": [{ \"name\": \"...\", \"pros\": [\"...\"], \"cons\": [\"...\"] }],
  \"reviewNotes\": [{ \"reviewer\": \"klay\", \"verdict\": \"...\", \"highlights\": [\"...\"] }],
  \"complexityScore\": N,
  \"complexityLevel\": \"low|mid|high\"
}
\`\`\`

Rules:
- 리뷰어가 제시한 변경 사항을 모두 반영
- 최종 JSON은 반드시 유효한 JSON이어야 함
- reviewNotes에 각 리뷰어의 verdict와 핵심 피드백 포함"
})
```
