---
name: clean-code
description: "Clean Code 원칙 적용. Robert C. Martin 기반 코드 품질 검증 + 자동 리팩토링. /aing:refactor 시 자동 연동."
triggers: ["clean code", "클린 코드", "uncle bob", "코드 정리", "코드 품질"]
---

# /aing:clean-code — Clean Code Principles

> "Code is clean if it can be read, and enhanced by a developer other than its original author." — Grady Booch

## Usage
```
/aing:clean-code [files...]        # 지정 파일에 clean code 원칙 적용
/aing:clean-code --audit           # 감사 모드 (리포트만, 수정 없음)
/aing:refactor <target>            # refactor 시 자동 연동
```

## Principles

### 1. Naming
- Intention-Revealing: `elapsedTimeInDays` not `d`
- No Disinformation: `accountList`가 실제로 Map이면 `accountMap`으로
- Meaningful Distinctions: `ProductData` vs `ProductInfo` 금지
- Pronounceable/Searchable: `genymdhms` 금지
- Class = Noun (`Customer`, `WikiPage`). `Manager`, `Data` 지양
- Method = Verb (`postPayment`, `deletePage`)

### 2. Functions
- 20줄 이하 권장
- Single Responsibility: 하나의 일만 수행
- One Level of Abstraction: 고수준 로직과 저수준 디테일 혼합 금지
- Arguments: 0이 이상적, 1-2 허용, 3+ 정당한 사유 필요
- No Side Effects: 전역 상태 몰래 변경 금지

### 3. Comments
- Bad code를 주석으로 설명하지 말고 코드를 고쳐라
- Good: Legal, Informative (regex 의도), Clarification (외부 라이브러리), TODO
- Bad: Mumbling, Redundant, Misleading, Mandated, Noise, Position Markers

### 4. Formatting
- Newspaper Metaphor: 상단에 고수준, 하단에 디테일
- Vertical Density: 관련 코드는 가까이
- Variable 선언은 사용처 근처에

### 5. Objects & Data Structures
- Data Abstraction: 인터페이스 뒤에 구현 숨기기
- Law of Demeter: `a.getB().getC().doSomething()` 금지
- DTO: public 변수, 함수 없음

### 6. Error Handling
- Return code 대신 Exception 사용
- Null 반환 금지 — Optional/Result 패턴
- Null 전달 금지

### 7. Classes
- SRP: Single Responsibility
- Stepdown Rule: 위에서 아래로 읽히는 내러티브

### 8. Code Smells
- Rigidity: 변경이 어려움
- Fragility: 한 곳 수정 시 여러 곳 깨짐
- Immobility: 재사용 불가
- Viscosity: 올바른 방법이 어려운 방법
- Needless Complexity/Repetition

## Step 1: Scope Detection

대상 파일 결정:
- 명시적 파일 경로가 있으면 해당 파일
- 없으면 `git diff --name-only HEAD~1` 최근 변경 파일
- `--audit` 모드면 수정 없이 리포트만

## Step 2: Clean Code Audit (Klay)

```
Agent({
  subagent_type: "aing:klay",
  description: "Klay: Clean Code 감사 -- {scope}",
  model: "sonnet",
  prompt: "[CLEAN CODE AUDIT]
다음 파일들에 Clean Code 원칙을 적용하여 감사하세요: {files}

각 파일을 읽고 아래 체크리스트로 평가:

## Checklist
- [ ] 모든 이름이 의도를 드러내는가? (d → elapsedTimeInDays)
- [ ] 함수가 20줄 이하인가?
- [ ] 함수가 정확히 하나의 일만 하는가?
- [ ] 추상화 수준이 혼합되지 않았는가?
- [ ] 함수 인자가 3개 이하인가?
- [ ] 불필요한 주석이 코드 개선으로 제거 가능한가?
- [ ] Null 반환/전달이 없는가?
- [ ] Law of Demeter 위반이 없는가? (체인 호출)
- [ ] 클래스가 SRP를 준수하는가?
- [ ] Code Smell(Rigidity/Fragility/Immobility)이 있는가?

출력 포맷:
## Clean Code Audit
| File:Line | Principle | Violation | Suggestion |
|-----------|-----------|-----------|------------|

## Score: {0-100}/100
## Top 3 Priority Fixes:
1. {가장 큰 위반}
2. {두 번째}
3. {세 번째}"
})
```

## Step 3: Apply Fixes (Jay/Derek)

`--audit` 모드가 아니면 수정 실행:

```
Agent({
  subagent_type: "aing:jay",  // frontend면 derek
  description: "Jay: Clean Code 적용 -- {scope}",
  model: "sonnet",
  prompt: "[CLEAN CODE APPLY]
Klay의 감사 결과를 기반으로 코드를 수정하세요.

=== AUDIT RESULT ===
{Klay's audit output}

Rules:
- behavior-preserving: 기능 변경 없이 구조/이름만 개선
- 한 번에 하나의 원칙만 적용 (혼합 금지)
- 기존 테스트가 깨지면 즉시 중단
- 변경 전후를 명확히 표시

Priority:
1. Naming 개선 (가장 낮은 위험)
2. Function 분리 (중간 위험)
3. Error handling 개선 (높은 위험 — 테스트 필수)"
})
```

## Step 4: Report

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  aing clean-code: {scope}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Files Audited: {N}
  Score: {before}/100 → {after}/100
  Violations Fixed: {N}/{total}

  Naming:    {N} fixed
  Functions: {N} split/simplified
  Comments:  {N} removed (code clarified)
  Errors:    {N} improved

  Remaining: {N} violations (manual review)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
