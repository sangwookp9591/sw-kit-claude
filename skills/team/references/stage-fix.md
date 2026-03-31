# Stage 4: team-fix (= PDCA Act)

**Max 3회 반복**. 초과 시 FAIL verdict로 completion 진행.

## Fix with Context

When entering team-fix, read the latest handoff to understand what was tried:
1. Read `.aing/handoffs/{feature}/team-verify-*.md` for verification findings
2. Pass findings to fix agents so they don't repeat failed approaches
3. After fix, write a team-fix handoff documenting what was changed

If fix loop reaches max (3) AND same error persists:
- Suggest `/aing debug` for scientific debugging
- Include error signature in the debug handoff

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
This is retry #{attempt} of 3.

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
- Fix 완료 → team-verify (재검증)
- Fix 실패 + attempt < 3 → team-fix (재시도)
- Fix 실패 + attempt ≥ 3 → completion (FAIL)
