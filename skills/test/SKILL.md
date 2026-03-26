---
name: test
description: "테스트 실행/분석/커버리지. 기존 테스트 런 + 커버리지 갭 분석 + 누락 테스트 생성."
triggers: ["test", "테스트 실행", "커버리지", "test run", "test cover", "test gen"]
---

# /aing test — Test Runner & Coverage Analysis

## Usage
```
/aing test                    — 전체 테스트 실행 + 커버리지 분석
/aing test run                — 테스트 실행만
/aing test cover <target>     — 특정 모듈 커버리지 갭 분석
/aing test gen <target>       — 누락 테스트 자동 생성
```

## Mode Detection

인자 파싱:
1. `run` → **실행 모드**
2. `cover <target>` → **커버리지 분석 모드**
3. `gen <target>` → **테스트 생성 모드**
4. 인자 없음 → **전체 모드** (실행 + 분석)

---

## Mode A: 테스트 실행 (run)

### Step 1: 테스트 프레임워크 감지

```bash
# package.json에서 test script 확인
node -e "const p=JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log(JSON.stringify({scripts:p.scripts,devDeps:Object.keys(p.devDependencies||{})}))"
```

감지 우선순위:
- `vitest` → `npx vitest run`
- `jest` → `npx jest`
- `node:test` (scripts/\*.test.mjs 패턴) → `node --test`
- `mocha` → `npx mocha`
- `package.json scripts.test` → `npm test`

### Step 2: 테스트 실행

```bash
# 감지된 프레임워크로 실행
{detected_test_command}
```

### Step 3: 결과 파싱 및 리포트

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  aing test: run
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Total: {N} tests
  Pass:  {N} ✅
  Fail:  {N} ❌
  Skip:  {N} ⏭️
  Time:  {N}s

  {failing test details if any}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Mode B: 커버리지 분석 (cover)

### Step 1: Klay — 코드-테스트 매핑

```
Agent({
  subagent_type: "aing:klay",
  description: "Klay: 커버리지 분석 — {target}",
  model: "haiku",
  prompt: "[COVERAGE ANALYSIS]
다음 대상의 테스트 커버리지를 분석하세요: {target}

수행:
1. 대상 디렉토리/파일의 모든 exported 함수 목록 추출
2. 테스트 파일 탐색 (*.test.*, *.spec.*, __tests__/)
3. 각 함수가 테스트에서 호출되는지 확인 (Grep)
4. 엣지 케이스 커버리지 평가

출력 포맷:
## Coverage Map
| Source File | Function | Test File | Covered | Edge Cases |
|-------------|----------|-----------|---------|------------|
| {path} | {name} | {test path or NONE} | yes/no | {missing edges} |

## Summary
- Total functions: {N}
- Covered: {N} ({pct}%)
- Uncovered: {N}
- Missing edge cases: {N}

## Priority Gaps (highest risk uncovered)
1. {function} in {file} — {why risky}
2. ..."
})
```

### Step 2: 갭 리포트

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  aing test cover: {target}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Functions: {N} total
  Covered:   {N} ({pct}%)
  Gaps:      {N} functions without tests

  Top Priority:
  1. {function} — {reason}
  2. {function} — {reason}

  → /aing test gen {target} 으로 누락 테스트 생성
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Mode C: 테스트 생성 (gen)

### Step 1: 커버리지 분석 (Mode B의 Step 1 재사용)

Mode B를 먼저 실행하여 갭 파악.

### Step 2: Jay — 테스트 코드 생성

```
Agent({
  subagent_type: "aing:jay",
  description: "Jay: 테스트 생성 — {target}",
  model: "sonnet",
  prompt: "[TEST GENERATION]
다음 커버리지 갭에 대한 테스트를 생성하세요.

=== COVERAGE GAPS ===
{Klay's coverage map — uncovered functions only}

=== PROJECT TEST PATTERN ===
기존 테스트 파일을 2-3개 읽고 프로젝트의 테스트 패턴을 파악하세요:
- 테스트 프레임워크 (node:test, vitest, jest, etc.)
- 파일 명명 규칙 (*.test.mjs, *.spec.ts, etc.)
- 헬퍼/fixture 패턴
- assertion 스타일

Rules:
- 프로젝트의 기존 테스트 패턴을 정확히 따를 것
- 각 uncovered 함수에 대해:
  - Happy path 테스트 1개 이상
  - Edge case 테스트 (null, empty, boundary)
  - Error case 테스트 (잘못된 입력)
- 테스트 파일 위치는 기존 패턴을 따를 것
- tmpdir 사용으로 파일시스템 테스트 격리
- 생성한 테스트가 실제 통과하는지 실행하여 확인

출력: 생성한 테스트 파일 목록 + 실행 결과"
})
```

### Step 3: 결과 리포트

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  aing test gen: {target}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Generated: {N} test files
  New tests: {N}
  All passing: ✅ / ❌

  Files:
  + {test file 1}
  + {test file 2}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Mode D: 전체 모드 (인자 없음)

순차 실행: **run** → **cover** (전체 프로젝트) → 갭 리포트

---

## Error Handling
- 테스트 프레임워크 감지 실패 → 사용자에게 test command 질문
- 테스트 실행 실패 (exit code ≠ 0) → 실패 테스트 상세 출력
- Klay 분석 실패 → 파일 목록만으로 기본 매핑 시도
- 생성된 테스트 실패 → Jay에게 수정 요청 (최대 2회)
