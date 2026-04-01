# Stage 1: team-plan (= PDCA Plan)

**Skip 조건**: `--plan <path>` 제공 시 또는 `/aing plan`에서 전환된 경우 이 단계를 건너뜁니다.

## Complexity별 Plan 분기

| Level | Score | Plan 방식 | 이유 |
|-------|-------|----------|------|
| **low** | ≤ 3 | Able(sonnet) 단독 | 빠른 실행, 충분한 품질 |
| **mid** | 4-7 | Able(sonnet) + Klay(haiku) quick review | 아키텍처 점검 필요 |
| **high** | ≥ 7 | `/aing plan-task` 리다이렉트 | 6자 합의 필요 → plan 완료 후 team-exec으로 복귀 |

### Low — Able 단독

```
Agent({
  subagent_type: "aing:able",
  description: "Able: 작업 계획 수립 — {task}",
  model: "sonnet",
  prompt: "..."
})
```

### Mid — Able + Klay Quick Review

```
# Step 1: Able 계획
Agent({
  subagent_type: "aing:able",
  description: "Able: 작업 계획 수립 — {task}",
  model: "sonnet",
  prompt: "..."
})

# Step 2: Klay quick review (순차 — Able 완료 후)
Agent({
  subagent_type: "aing:klay",
  description: "Klay: 계획 quick review",
  model: "haiku",
  prompt: "[QUICK PLAN REVIEW]
Able의 계획을 간략히 리뷰하세요. 3분 이내, tool call 5회 이내.

=== PLAN ===
{Able's output}

확인 사항:
1. 파일 경로가 실제 존재하는가? (Glob으로 확인)
2. 명백한 아키텍처 위험이 있는가?
3. task 간 의존성/파일 겹침이 있는가?

출력:
- APPROVE: 진행
- SUGGEST: {1-2개 제안} → Able 반영 후 진행
- REJECT: {사유} → Able 재작성 (1회만)"
})
```

### High — plan-task 리다이렉트

```
Skill("aing:plan-task") 호출 → plan 완료 후 team-exec으로 복귀
plan 파일 경로를 --plan 파라미터로 전달
```

## Task 분해 가이드라인

Able 프롬프트에 다음 가이드라인을 포함합니다:

### Task 크기 제어
- **task당 touch 파일 수**: max 5개. 초과 시 task를 분할
- **task 총 수**: soft cap **8개**. 초과 시 관련 task를 그룹핑
- 각 task에 **touch 파일 목록** 명시 필수 (파일 겹침 감지용)

### 파일 겹침 감지 (MANDATORY)

Able의 plan 출력에서 task별 files 필드를 추출하여 겹침을 확인합니다:

```
task#1: files: [src/api/auth.ts, src/api/routes.ts]
task#2: files: [src/api/auth.ts, src/components/Login.tsx]
→ auth.ts 겹침 감지 → task#1, task#2를 순차 그룹으로 묶기
```

겹침 결과를 team-exec에 전달:
```
parallelGroups: [
  { group: 1, tasks: [1, 3], mode: "parallel" },
  { group: 2, tasks: [2], mode: "sequential_after_1", reason: "file overlap: src/api/auth.ts" }
]
```

## Persist Plan + Tasks (MANDATORY)

Able 완료 후 **반드시 실행**:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/scripts/cli/persist.js" plan \
  --dir "$(pwd)" \
  --feature "{feature}" \
  --goal "{goal from Able}" \
  --steps "{step1}|{step2}|{step3}" \
  --criteria "{criterion1}|{criterion2}" \
  --risks "{risk1}|{risk2}"
```

**persist 실패 시 fallback**: CLI arg 모드로 재시도. 재실패 시 plan을 `.aing/plans/` 에 직접 Write로 저장.

## 출력 아티팩트
- Plan file: `.aing/plans/{date}-{feature}.md` ← persist.js가 생성
- Task file: `.aing/tasks/task-{id}.json` ← persist.js가 생성
- Tasks: TaskCreate로 CC 팀 태스크도 생성, owner 사전 할당
- **parallelGroups**: 파일 겹침 분석 결과 (team-exec에 전달)

## 전환 조건 → team-exec
- Plan 파일 존재
- 모든 Tasks가 TaskCreate로 생성됨
- parallelGroups 분석 완료
