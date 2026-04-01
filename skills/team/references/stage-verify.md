# Stage 3: team-verify (= PDCA Check)

## 실행

**IMPORTANT**: Sam은 team-verify에서 `model: "haiku"`로 스폰합니다 (agents/sam.md의 기본 opus를 오버라이드). verify-fix 루프의 비용 효율을 위한 의도적 선택입니다.

Milla와 Sam을 순차 또는 병렬로 스폰:

```
Agent({
  subagent_type: "aing:milla",
  description: "Milla: 보안 리뷰 + 코드 품질 점검",
  team_name: "<feature-slug>",
  name: "milla",
  model: "sonnet",
  prompt: "보안 리뷰 + 코드 품질 점검. 모든 변경사항 검토."
})

Agent({
  subagent_type: "aing:sam",
  description: "Sam: 증거 체인 검증 + 최종 판정",
  team_name: "<feature-slug>",
  name: "sam",
  model: "haiku",    ← opus 오버라이드
  prompt: "증거 체인 검증: test/build/lint 결과 수집 + 판정."
})
```

터미널 표시:
```
⏺ aing:milla(Milla: 보안 리뷰 + 코드 품질 점검) Sonnet
⏺ aing:sam(Sam: 증거 체인 검증 + 최종 판정) Haiku
```

## 검증 기준 (verify-evidence/SKILL.md 준수)
- [test] 테스트 통과 여부
- [build] 빌드 성공 여부
- [lint] 린트 에러 없음
- 누락된 증거는 PASS가 아닌 NOT_AVAILABLE

## QA Loop Integration

After team-verify agents complete their review, if implementation tests exist:
1. Run `/aing qa` with the project test command
2. QA results feed into the verification report
3. If QA fails → trigger team-fix stage
4. If QA passes → include in verification evidence

## Verdict — 묻지 않고 자동 전환

**하네스 원칙**: "검증할까요?" / "리뷰 먼저 할까요?" 같은 질문은 금지입니다. 파이프라인이 자동으로 판정하고 전환합니다.

- **PASS**: 모든 증거 체인 통과 → **team-architect** (Klay 이중 검증)
- **FAIL**: 실패 항목 + 구체적 사유 → 자동으로 `team-fix` 단계로

## Architect 이중 검증 (team-architect)

Milla/Sam PASS 후 자동 실행. Klay(opus)가 아키텍트 관점에서 독립 검증:

```
Agent({
  subagent_type: "aing:klay",
  description: "Klay: Architect 이중 검증 — 완료 claim 검증",
  model: "opus",
  prompt: "[ARCHITECT VERIFY] ... (architect-verify.ts가 상태 관리)"
})
```

**코드 수준 강제** (`scripts/hooks/architect-verify.ts`):
- `startVerification()` → state 파일에 pending=true 기록
- stop hook이 pending 상태에서 세션 종료 차단
- APPROVED → `recordApproval()` → completion
- REJECTED → `recordRejection(feedback)` → team-fix (max 3 attempts)

## 전환 조건
- Milla/Sam PASS → team-architect (Klay 검증)
- Klay APPROVED → completion
- Klay REJECTED → team-fix
- Milla/Sam FAIL → team-fix (unbounded — cancel만 종료)
