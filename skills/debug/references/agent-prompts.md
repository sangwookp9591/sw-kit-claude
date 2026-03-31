# Debug Agent Prompts

## Klay — 증상 수집 (Step 3)

```
Agent({
  subagent_type: "aing:klay",
  description: "Klay: 증상 수집 — {slug}",
  model: "sonnet",
  prompt: "[DEBUG MODE] 다음 증상을 조사하세요: {symptom}

출력 포맷 (SYMPTOM_REPORT):
## Symptom
{user's description}

## Reproduction
- Steps to reproduce (if determinable)
- Error messages / stack traces found

## Affected Files
| File | Line | Relevance |
|------|------|-----------|
| {path} | {line} | {why relevant} |

## Initial Observations
- {observation 1 with file:line evidence}
- {observation 2}

Rules:
- 실제 코드를 읽고 증거 기반으로 작성
- 추측 금지 — 모든 관찰에 file:line 참조 필수
- 에러 메시지, 스택 트레이스, 로그를 찾아서 포함"
})
```

## Klay — 가설 생성 (Step 4)

```
Agent({
  subagent_type: "aing:klay",
  description: "Klay: 가설 생성 — {slug}",
  model: "sonnet",
  prompt: "[DEBUG MODE] 다음 증상 보고서를 기반으로 가설을 생성하세요.

=== SYMPTOM_REPORT ===
{Klay의 Step 3 출력}

출력 포맷 (HYPOTHESIS_SET):
## Hypotheses

### H1: {hypothesis name}
- **Claim**: {what you think is wrong}
- **Evidence FOR**: {observations supporting this}
- **Evidence AGAINST**: {observations contradicting this}
- **Test**: {how to verify/falsify — specific command, file check, or code change}
- **Confidence**: HIGH / MEDIUM / LOW

### H2: {hypothesis name}
(same format)

## Recommended Investigation Order
1. {H_id} — {reason: highest confidence / easiest to test / highest impact}
2. {H_id} — {reason}

## Discriminating Probe
{가설들을 가장 효과적으로 구분하는 단일 테스트}

Rules:
- 최소 2개 가설 필수 (단일 가설은 확증 편향 위험)
- 각 가설에 반드시 Evidence AGAINST 포함 (반증 가능성)
- Test는 구체적이고 실행 가능해야 함"
})
```

## Jay — 가설 검증 + 수정 (Step 5)

```
Agent({
  subagent_type: "aing:jay",
  description: "Jay: 가설 검증 — {top hypothesis}",
  model: "sonnet",
  prompt: "[DEBUG MODE] 다음 가설을 검증하세요.

=== HYPOTHESIS ===
{Step 4의 상위 가설}

=== DISCRIMINATING PROBE ===
{Step 4의 Discriminating Probe}

행동:
1. Discriminating Probe를 실행하여 가설 검증
2. 검증 결과에 따라:
   - CONFIRMED: 근본 원인 확인 → 수정 코드 작성
   - REFUTED: 다음 가설로 이동 (결과 반환)
   - INCONCLUSIVE: 추가 조사 필요 (구체적으로 무엇이 필요한지 명시)

출력 포맷 (TEST_RESULT):
## Hypothesis: {name}
## Verdict: CONFIRMED / REFUTED / INCONCLUSIVE
## Evidence
- {test performed}: {result}
- {file:line}: {what was found}

## Fix (if CONFIRMED)
{description of the fix applied}
{files changed with before/after}

## Next Steps (if REFUTED or INCONCLUSIVE)
- {what to investigate next}"
})
```

## Milla — 수정 검증 (Step 7)

```
Agent({
  subagent_type: "aing:milla",
  description: "Milla: 수정 검증 — {slug}",
  model: "sonnet",
  prompt: "다음 버그 수정을 검증하세요.

=== ORIGINAL SYMPTOM ===
{symptom}

=== FIX APPLIED ===
{Jay의 수정 내용}

검증 항목:
1. 수정이 원래 증상을 해결하는가?
2. 수정이 새로운 버그를 도입하지 않는가?
3. 관련 테스트가 통과하는가?
4. 보안 취약점이 없는가?

Verdict: PASS / FAIL — {reason}"
})
```
