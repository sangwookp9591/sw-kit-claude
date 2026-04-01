# Stage 5: completion (= PDCA Review)

## Completion Report

`auto/SKILL.md`의 리포트 포맷을 확장하여 verify/fix 루프 데이터를 포함합니다:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  aing team complete: {feature}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Team: {agents} ({N}명 exec + 2 verify)

  Agent        Role              Status   Summary
  ─────        ────              ──────   ───────
  Jay          Backend / API     done     3 endpoints, TDD 12/12 pass
  Derek        Frontend / Build  done     2 pages, 4 components
  Milla        Security          PASS     0 critical, 1 minor (fixed)
  Sam          CTO / Verify      PASS     Evidence chain: all green

  Pipeline:
  [plan]    DONE    Able — 4 tasks created
  [exec]    DONE    Jay, Derek — parallel execution
  [verify]  PASS    Milla + Sam (attempt 2/3)
  [fix]     1 round Jay fixed lint error

  Evidence Chain:
  [test]  PASS (24/24)
  [build] PASS
  [lint]  PASS (0 errors)
  Verdict: PASS

  Files changed: 12
  Duration: ~12 min
  Fix loops: 1

  Token Usage:
    plan:   ~{N}k tokens ({agent1} {N}k, {agent2} {N}k)
    exec:   ~{N}k tokens ({agent1} {N}k, {agent2} {N}k)
    total:  ~{N}k tokens

  Report: .aing/reports/{date}-{feature}.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Shutdown + Persist (MANDATORY)
1. **Completion report를 stdout에 먼저 출력** (persist 실패해도 사용자가 결과를 볼 수 있도록)
2. SendMessage shutdown_request to each worker
3. **Shutdown timeout 10초** — 무응답 워커는 강제 진행
4. TeamDelete({ team_name: "<feature-slug>" })
5. **Persist report + learning** (best-effort — 실패해도 completion 차단하지 않음):
```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/scripts/cli/persist.js" report --dir "$(pwd)" --feature "{feature}" --lessons "{lesson1}|{lesson2}"
```
6. This generates `.aing/reports/{date}-{feature}.md`

### Confidence Level

completion report에 Confidence를 표시합니다:
- **HIGH**: 모든 verify PASS + architect APPROVED + fix loop 0-1회
- **MED**: verify PASS + architect APPROVED + fix loop 2회 이상
- **LOW**: architect max attempts 소진 / token budget cancel / circuit breaker 발동 / INCOMPLETE task 존재

LOW인 경우 미해결 findings 목록을 report에 포함하여 사용자 수동 확인을 요청합니다.
