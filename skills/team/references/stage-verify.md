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

- **PASS**: 모든 증거 체인 통과 → 자동으로 `completion` 단계로
- **FAIL**: 실패 항목 + 구체적 사유 → 자동으로 `team-fix` 단계로

## 전환 조건
- PASS → completion
- FAIL → team-fix (fix 루프 카운트 < 3인 경우)
- FAIL + fix 루프 카운트 ≥ 3 → 강제 completion (FAIL verdict 포함)
