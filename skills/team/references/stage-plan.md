# Stage 1: team-plan (= PDCA Plan)

**Skip 조건**: `--plan <path>` 제공 시 또는 `/aing plan`에서 전환된 경우 이 단계를 건너뜁니다.

## 실행

Able 에이전트를 스폰합니다:

```
Agent({
  subagent_type: "aing:able",
  description: "Able: 작업 계획 수립 — {task}",
  model: "sonnet",
  prompt: "..."
})
```

터미널 표시:
```
⏺ aing:able(Able: 작업 계획 수립 — 사용자 인증 API) Sonnet
```

Able 에이전트가 수행:
1. 요구사항 분석 + 작업 분해
2. 에이전트별 태스크 할당
3. 구조화된 결과 반환 (feature, goal, steps, criteria, risks)

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

## 출력 아티팩트
- Plan file: `.aing/plans/{date}-{feature}.md` ← persist.mjs가 생성
- Task file: `.aing/tasks/task-{id}.json` ← persist.mjs가 생성
- Tasks: TaskCreate로 CC 팀 태스크도 생성, owner 사전 할당

## 전환 조건 → team-exec
- Plan 파일 존재
- 모든 Tasks가 TaskCreate로 생성됨
