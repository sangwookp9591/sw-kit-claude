---
name: perf
description: "성능 분석. 번들 사이즈/런타임/메모리/쿼리 프로파일링. Jun(분석) + Klay(구조) 협업."
triggers: ["perf", "성능", "performance", "느려", "slow", "bundle size", "메모리", "최적화"]
---

# /aing perf — Performance Profiling

## Usage
```
/aing perf <target>           — 종합 성능 분석
/aing perf bundle             — 번들 사이즈 분석
/aing perf runtime <target>   — 런타임 핫스팟 분석
/aing perf query <target>     — 쿼리/API 성능 분석
```

## Mode Detection

인자 파싱:
1. `bundle` → **번들 모드**
2. `runtime <target>` → **런타임 모드**
3. `query <target>` → **쿼리 모드**
4. `<target>` (기타) → **종합 모드**

---

## Mode A: 번들 분석 (bundle)

### Step 1: 빌드 프레임워크 감지 및 분석

```bash
# Next.js
npx next build 2>&1 | tail -50

# Vite
npx vite build --report 2>&1

# 일반 Webpack
npx webpack --profile --json > /tmp/webpack-stats.json
```

### Step 2: Klay — 번들 구조 분석

```
Agent({
  subagent_type: "aing:klay",
  description: "Klay: 번들 사이즈 분석",
  model: "haiku",
  prompt: "[BUNDLE ANALYSIS]
빌드 출력을 분석하고 번들 사이즈 최적화 기회를 찾으세요.

수행:
1. 빌드 출력에서 chunk/route 사이즈 파싱
2. package.json dependencies 크기 확인
3. dynamic import 사용 여부 확인
4. tree-shaking 누락 패턴 탐색

출력 포맷:
## Bundle Report
| Route/Chunk | Size | First Load JS |
|-------------|------|---------------|
| {name} | {kb} | {kb} |

## Large Dependencies
| Package | Size (estimated) | Used In |
|---------|-----------------|---------|
| {name} | {kb} | {files} |

## Optimization Opportunities
| Priority | Issue | Saving | How |
|----------|-------|--------|-----|
| high/med/low | {issue} | ~{kb} | {solution} |

## Quick Wins
1. {actionable optimization}
2. ..."
})
```

---

## Mode B: 런타임 분석 (runtime)

### Step 1: Jun — 런타임 핫스팟 분석

```
Agent({
  subagent_type: "aing:jun",
  description: "Jun: 런타임 성능 분석 — {target}",
  model: "sonnet",
  prompt: "[RUNTIME ANALYSIS]
다음 코드의 런타임 성능을 분석하세요: {target}

분석 항목:
1. **알고리즘 복잡도**: O(n²) 이상 루프, 중첩 반복
2. **메모리 패턴**: 대용량 배열/객체 생성, 클로저 누수
3. **비동기 병목**: 순차 await (Promise.all 가능), 블로킹 I/O
4. **캐싱 부재**: 반복 계산, 중복 API 호출, 중복 DB 쿼리
5. **불필요한 연산**: 사용되지 않는 계산, 과도한 직렬화

코드를 직접 읽고 분석하세요.

출력 포맷:
## Runtime Hotspots
| Severity | File:Line | Issue | Impact | Fix |
|----------|-----------|-------|--------|-----|
| critical/major/minor | {loc} | {issue} | {impact} | {fix} |

## Memory Concerns
| File:Line | Pattern | Risk |
|-----------|---------|------|
| {loc} | {pattern} | {risk} |

## Async Bottlenecks
| File:Line | Current | Suggested |
|-----------|---------|-----------|
| {loc} | {sequential pattern} | {parallel pattern} |

## Verdict: CLEAN / NEEDS_OPTIMIZATION
## Estimated Impact: {description}"
})
```

---

## Mode C: 쿼리/API 분석 (query)

### Step 1: Jay — 쿼리 성능 분석

```
Agent({
  subagent_type: "aing:jun",
  description: "Jun: 쿼리 성능 분석 — {target}",
  model: "sonnet",
  prompt: "[QUERY ANALYSIS]
다음 코드의 데이터베이스/API 호출 패턴을 분석하세요: {target}

분석 항목:
1. **N+1 쿼리**: 루프 내 개별 쿼리 (배치/조인으로 변환 가능)
2. **인덱스 누락**: WHERE/ORDER BY 컬럼의 인덱스 여부
3. **과도한 SELECT**: SELECT * 또는 불필요 컬럼 조회
4. **트랜잭션 범위**: 불필요하게 긴 트랜잭션
5. **캐싱 기회**: 반복 동일 쿼리, 변하지 않는 데이터

출력 포맷:
## Query Analysis
| Severity | File:Line | Issue | Current | Suggested |
|----------|-----------|-------|---------|-----------|
| {sev} | {loc} | {issue} | {current pattern} | {optimized pattern} |

## API Call Patterns
| Endpoint | Call Count | Cacheable | Batchable |
|----------|-----------|-----------|-----------|
| {url/query} | {N per request} | yes/no | yes/no |

## Verdict: CLEAN / NEEDS_OPTIMIZATION"
})
```

---

## Mode D: 종합 분석 (기본)

### Step 1: Klay 구조 스캔 + Jun 런타임 분석 **병렬 실행**

```
Agent({
  subagent_type: "aing:klay",
  description: "Klay: 성능 구조 스캔 — {target}",
  model: "haiku",
  prompt: "프로젝트의 성능 관련 구조를 스캔하세요: {target}
  - 번들 설정, 빌드 최적화 상태
  - 캐싱 레이어 존재 여부
  - CDN/edge 설정 여부
  간략한 구조 리포트로 출력."
})

Agent({
  subagent_type: "aing:jun",
  description: "Jun: 런타임 성능 분석 — {target}",
  model: "sonnet",
  prompt: "[위 Mode B의 프롬프트]"
})
```

### Step 2: 통합 리포트

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  aing perf: {target}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Runtime Hotspots: {N} ({critical}C / {major}M / {minor}m)
  Memory Concerns:  {N}
  Async Bottlenecks: {N}
  Query Issues:      {N}

  Top Issues:
  1. {issue} — {file:line} — {fix}
  2. {issue} — {file:line} — {fix}
  3. {issue} — {file:line} — {fix}

  Verdict: {CLEAN / NEEDS_OPTIMIZATION}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Error Handling
- 빌드 실패 → 빌드 없이 코드 레벨 분석만 수행
- 테스트 프레임워크 없음 → 정적 분석만
- Jay 실패 → Klay 구조 분석만으로 축소 리포트
