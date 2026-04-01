# Stage 4: team-fix (= PDCA Act) — Unbounded Persistence

**Unbounded** — cancel만 종료. stop hook(`persistent-mode.ts`)이 세션 종료를 차단.
iteration soft cap에 도달하면 +3 확장. circuit breaker(20회/5분)만이 fail-safe.

## Error Recovery (코드 강제)

`scripts/hooks/error-recovery.ts`가 동일 에러를 추적:
- **4회 반복**: 대안 접근 제안 (advisory)
- **6회 반복**: 대안 접근 **강제** (같은 도구/명령 사용 금지)
- 성공 시 자동 리셋

## Fix with Context

When entering team-fix, read the latest handoff to understand what was tried:
1. Read `.aing/handoffs/{feature}/team-verify-*.md` for verification findings
2. Read `.aing/handoffs/{feature}/team-architect-*.md` for architect feedback (있으면)
3. Pass findings to fix agents so they don't repeat failed approaches
4. After fix, write a team-fix handoff documenting what was changed

에러가 지속되면 (`error-recovery.ts` 감지):
- `/aing debug` 로 전환하여 근본 원인 분석 제안
- error signature를 debug handoff에 포함

## 실행

실패한 태스크의 원래 담당 에이전트를 **새 Task로** 재스폰합니다 (기존 task reset이 아닌 새로 생성):

```
Agent({
  subagent_type: "aing:{name}",
  description: "{Name}: Fix #{attempt} — {실패 사유 요약}",
  model: "{original model}",
  prompt: "... (아래 Retry Template 참조) ..."
})
```

터미널 표시:
```
⏺ aing:jay(Jay: Fix #1 — lint 에러 수정) Sonnet
```

## Fix Worker Prompt (Retry Template)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {Name} 재투입 — 수정 작업
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You are {Name} in team "{feature-slug}".
This is fix attempt #{attempt} (unbounded — cancel만 종료).

ORIGINAL TASK: {원래 태스크 설명}

VERIFICATION FAILURE:
{Milla/Sam의 검증 실패 출력 — 구체적 사유}

YOUR MISSION:
위 검증 실패를 수정하세요. 수정 후 테스트를 실행하여 통과를 확인하세요.

COMMUNICATION FORMAT:
"@{Name}❯ Fix #{attempt}: {what you fixed}. Evidence: {test results}"

PROTOCOL:
1. 실패 원인 분석
2. 코드 수정
3. 테스트 실행 (TDD)
4. 증거 수집
5. SendMessage "@{Name}❯ Fix #{attempt} 완료: {summary}. Evidence: {results}"
```

## 전환 조건
- Fix 완료 → team-verify (재검증) → team-architect (이중 검증)
- Fix 실패 → team-fix (재시도, unbounded)
- 명시적 cancel → completion
- Circuit breaker (20회/5분) → completion (fail-safe)
