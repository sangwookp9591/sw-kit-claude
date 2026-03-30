# aing v3.0 Roadmap — gstack 능가 프로젝트

**목표**: gstack의 워크플로우 완성도(43K LOC)를 ai-ng의 에이전트 구조(16K LOC)에 결합하여 능가
**기준일**: 2026-03-30
**현재 버전**: v2.5.0 (15명 에이전트, 83 스크립트 모듈, 45/45 테스트)
**목표 버전**: v3.0.0

---

## 현황 대시보드

```
                  gstack        ai-ng v2.5     ai-ng v3.0 (목표)
                  ──────        ──────────     ─────────────────
Total LOC         43,641        16,329         30,000+
Test LOC          19,133        3,918          12,000+
Test/Code Ratio   44%           24%            40%+
E2E Tests         15            0              15+
Skills            39            26             35+
Review Categories 18            3              18+
Ship Steps        7 (구현)      7 (템플릿)     7 (구현)
QA Health Score   구현           템플릿         구현
CLI Utils         12            0              8+
Documentation     5 docs        2 docs         5 docs
```

---

## Phase 구조

```
Phase 1: Foundation (2주)     — Ship 구현 + QA 엔진
Phase 2: Quality Gate (2주)   — Review 18-cat + Pre-landing
Phase 3: Testing (2주)        — E2E 15개 + 테스트 커버리지 40%
Phase 4: Safety (1.5주)       — Safety skills + Canary
Phase 5: Tooling (1.5주)      — CLI utils + Design checklist
Phase 6: Documentation (1주)  — ARCHITECTURE + CONTRIBUTING
Phase 7: Polish (1주)         — 통합 테스트 + 성능 최적화
                              ─────────────────────────
                              Total: 11주 (~14,000 LOC)
```

---

## Phase 1: Foundation (Week 1-2)

**목표**: Ship과 QA가 실제로 동작하는 상태. 현재 템플릿만 있는 모듈을 production 수준으로.

### 1.1 Ship 파이프라인 실제 구현

**현재**: scripts/ship/ (4개 모듈, 502 LOC) — 데이터 구조만 정의
**목표**: 7단계 파이프라인이 실제로 git 명령을 실행하고 PR을 생성

| 파일 | 상태 | 필요 작업 | LOC |
|------|:----:|----------|:---:|
| ship-engine.mjs | 있음 | state 관리만 → 실제 실행 로직 추가 | +200 |
| ship-orchestrator.mjs | **신규** | 7단계 순차 실행 컨트롤러 | +350 |
| preflight-check.mjs | **신규** | branch 검증 + review dashboard + evidence 체크 | +150 |
| merge-engine.mjs | **신규** | git fetch + merge + conflict 감지 | +120 |
| test-triage.mjs | **신규** | base branch 대비 failure 분류 (pre-existing vs new) | +180 |
| version-bump.mjs | 있음 | package.json 업데이트 로직 추가 | +80 |
| changelog-gen.mjs | 있음 | prepend 로직 강화 + edge case | +50 |
| pr-creator.mjs | 있음 | gh CLI 실행 로직 추가 | +100 |

**합계**: ~1,230 LOC 추가
**검증**: `node --test tests/ship-e2e.test.mjs` (8개 테스트)

### 1.2 QA 엔진 구현

**현재**: scripts/review/qa-health-score.mjs (105 LOC) — 계산만
**목표**: 실제 테스트 실행 + health score + fix loop + regression 감지

| 파일 | 상태 | 필요 작업 | LOC |
|------|:----:|----------|:---:|
| qa-health-score.mjs | 있음 | 실제 테스트 결과 수집 연동 | +80 |
| qa-orchestrator.mjs | **신규** | QA 전체 사이클 컨트롤러 | +300 |
| fix-loop-engine.mjs | **신규** | triage→fix→commit→re-verify 루프 | +250 |
| regression-detector.mjs | **신규** | baseline 대비 비교 | +200 |
| severity-classifier.mjs | **신규** | CRITICAL/HIGH/MEDIUM/LOW 분류 | +150 |
| test-runner-wrapper.mjs | **신규** | npm test / bun test 래퍼 + 결과 파싱 | +180 |

**합계**: ~1,160 LOC 추가
**검증**: `node --test tests/qa-e2e.test.mjs` (6개 테스트)

### 1.3 Telemetry 훅 연동

**현재**: telemetry-engine.mjs 존재하지만 어떤 훅에서도 호출 안 됨
**목표**: session-start/stop 훅에서 자동 수집

| 파일 | 작업 | LOC |
|------|------|:---:|
| hooks-handlers/session-start.mjs | `logSession({ type: 'start' })` 추가 | +10 |
| hooks-handlers/stop.mjs | `logSession({ type: 'end' })` + `logSkillUsage()` 추가 | +15 |
| hooks-handlers/post-tool-use.mjs | `recoverPendingMarkers()` 호출 추가 | +5 |

**합계**: ~30 LOC 추가

### Phase 1 산출물
- [ ] Ship 7단계 실제 실행 가능
- [ ] QA health score + fix loop 동작
- [ ] Telemetry 데이터 자동 수집
- [ ] 테스트 14개 추가 (ship 8 + qa 6)
- **총 LOC**: ~2,420

---

## Phase 2: Quality Gate (Week 3-4)

**목표**: 코드 리뷰가 gstack 수준의 깊이를 가짐. 18-category 체크리스트 + pre-landing review.

### 2.1 Review 18-Category 체크리스트

**현재**: review-engine.mjs — CRITICAL 6 + INFORMATIONAL 6 = 12 항목 (이름만)
**목표**: 각 항목에 실제 검사 패턴 + 자동 감지 로직

| 파일 | 상태 | 필요 작업 | LOC |
|------|:----:|----------|:---:|
| review-checklist.mjs | **신규** | 18 카테고리 검사 엔진 | +400 |
| sql-safety-checker.mjs | **신규** | SQL injection 패턴 매칭 | +120 |
| race-condition-detector.mjs | **신규** | find-or-create, TOCTOU 패턴 | +150 |
| llm-boundary-checker.mjs | **신규** | system prompt 노출, output sanitization | +130 |
| enum-completeness-tracer.mjs | **신규** | 새 enum 값의 모든 소비자 추적 | +180 |
| auto-fixer.mjs | **신규** | 12 mechanical fix 패턴 (dead code, stale comments) | +200 |
| fix-first-classifier.mjs | 있음 | 12 auto-fix + 8 ask 패턴 확장 | +100 |

**합계**: ~1,280 LOC 추가

### 2.2 Pre-Landing Review (Ship Step 4)

**현재**: Ship SKILL.md에 "Milla가 review" 언급만
**목표**: ship step 4에서 자동 실행되는 pre-landing review

| 파일 | 상태 | 필요 작업 | LOC |
|------|:----:|----------|:---:|
| pre-landing-reviewer.mjs | **신규** | diff 기반 체크리스트 실행 | +250 |
| design-diff-scope.mjs | **신규** | frontend 변경 감지 → design review 트리거 | +100 |

**합계**: ~350 LOC 추가

### 2.3 Plan Review 분화 (CEO / Eng / Design)

**현재**: review-pipeline에 4-tier가 정의되어 있지만 각 tier의 구체적 실행 로직 없음
**목표**: CEO/Eng/Design 각각 고유한 review 프로세스

| 파일 | 작업 | LOC |
|------|------|:---:|
| ceo-reviewer.mjs | **신규** — 6-question + scope decision + dream state | +200 |
| eng-reviewer.mjs | **신규** — architecture + test coverage + perf | +250 |
| design-reviewer.mjs | **신규** — AI slop + litmus + accessibility | +200 |

**합계**: ~650 LOC 추가

### Phase 2 산출물
- [ ] 18-category review 체크리스트 동작
- [ ] Pre-landing review가 ship step 4에서 자동 실행
- [ ] CEO/Eng/Design 각각 독립 리뷰 로직
- [ ] 테스트 24개 추가 (체크리스트 18 + pre-landing 6)
- **총 LOC**: ~2,280

---

## Phase 3: Testing (Week 5-6)

**목표**: 테스트 커버리지 24% → 40%+. E2E 테스트 15개.

### 3.1 E2E 테스트 스위트

| 테스트 파일 | 대상 워크플로우 | 테스트 수 | LOC |
|------------|---------------|:--------:|:---:|
| plan-task-e2e.test.mjs | plan → task decomposition | 4 | 200 |
| review-e2e.test.mjs | review pipeline (4-tier) | 5 | 250 |
| ship-e2e.test.mjs | ship 7-step pipeline | 8 | 400 |
| qa-e2e.test.mjs | QA health + fix loop | 6 | 300 |
| design-e2e.test.mjs | design review + AI slop | 4 | 200 |
| debug-e2e.test.mjs | 4-phase debugging | 4 | 200 |
| pdca-e2e.test.mjs | full PDCA cycle | 5 | 250 |
| skill-routing-e2e.test.mjs | intent router → skill dispatch | 8 | 300 |
| auto-e2e.test.mjs | auto pipeline (Solo→Full) | 5 | 250 |
| team-e2e.test.mjs | team staged pipeline | 4 | 200 |
| retro-e2e.test.mjs | retrospective generation | 3 | 150 |
| cso-e2e.test.mjs | CSO 14-phase audit | 4 | 200 |
| ship-readiness-e2e.test.mjs | PDCA + review + evidence → ship gate | 5 | 250 |
| freeze-e2e.test.mjs | freeze/unfreeze boundary | 3 | 150 |
| telemetry-e2e.test.mjs | session tracking + pending marker | 3 | 150 |

**합계**: 71 E2E 테스트, ~3,250 LOC

### 3.2 순수 함수 유닛 테스트 보강

| 모듈 | 누락된 테스트 | 추가 수 | LOC |
|------|-------------|:-------:|:---:|
| evidence-chain.mjs | addEvidence, evaluateChain | 5 | 150 |
| goal-checker.mjs | deriveAssertions, checkGoal | 4 | 120 |
| completeness-scorer.mjs | calculateCompleteness, getVerdict | 4 | 100 |
| context-budget.mjs | estimateTokens, trimToTokenBudget | 3 | 80 |
| complexity-scorer.mjs | scoreComplexity | 3 | 80 |
| model-router.mjs | routeModel | 4 | 100 |

**합계**: 23 유닛 테스트, ~630 LOC

### Phase 3 산출물
- [ ] 71 E2E 테스트 + 23 유닛 테스트 = 94 신규 테스트
- [ ] 기존 45 + 신규 94 = 139 총 테스트
- [ ] 테스트 LOC: 3,918 + 3,880 = ~7,800 (커버리지 ~40%)
- **총 LOC**: ~3,880

---

## Phase 4: Safety (Week 7-8)

**목표**: production 배포 안전성. 5개 safety skill.

### 4.1 Safety Skills 구현

| 스킬 | 역할 | 구현 파일 | LOC |
|------|------|---------|:---:|
| careful | 배포 전 안전 체크리스트 | careful-checklist.mjs | 200 |
| guard | 코드 변이 방지 + 감사 | mutation-guard.mjs | 180 |
| freeze | 파일 잠금 (있음) | freeze-engine.mjs (강화) | +50 |
| unfreeze | 잠금 해제 (있음) | freeze-engine.mjs (있음) | 0 |
| canary | 점진적 배포 + 모니터링 | canary-monitor.mjs | 300 |

**합계**: ~730 LOC 추가

### 4.2 Deploy 통합

| 파일 | 작업 | LOC |
|------|------|:---:|
| deploy-orchestrator.mjs | **신규** — PR merge → CI → deploy → canary | 250 |
| health-checker.mjs | **신규** — 배포 후 URL 헬스 체크 루프 | 150 |

**합계**: ~400 LOC 추가

### Phase 4 산출물
- [ ] careful/guard/canary 스킬 동작
- [ ] 배포 후 자동 헬스 체크
- [ ] 테스트 8개 추가
- **총 LOC**: ~1,130

---

## Phase 5: Tooling (Week 9)

**목표**: CLI 유틸리티 + Design 체크리스트 완성.

### 5.1 CLI 유틸리티

| 유틸리티 | 역할 | LOC |
|---------|------|:---:|
| scripts/cli/aing-config.mjs | 설정 관리 (get/set/list) | 80 |
| scripts/cli/aing-diff-scope.mjs | 변경 범위 감지 (FE/BE/Prompts/Tests/Docs) | 120 |
| scripts/cli/aing-analytics.mjs | 사용 통계 대시보드 | 150 |
| scripts/cli/aing-update-check.mjs | 버전 업데이트 감지 | 80 |
| scripts/cli/aing-doctor.mjs | 설치 상태 진단 | 100 |

**합계**: ~530 LOC

### 5.2 Design 6-Category 체크리스트

| 파일 | 카테고리 | LOC |
|------|---------|:---:|
| design-checklist.mjs | 6 카테고리 검사 엔진 | 300 |
| typography-validator.mjs | 폰트/사이즈/계층 검증 | 120 |
| spacing-auditor.mjs | 간격 스케일 검증 | 100 |
| interaction-auditor.mjs | hover/focus/touch target | 100 |

**합계**: ~620 LOC

### Phase 5 산출물
- [ ] 5개 CLI 유틸리티 동작
- [ ] Design 6-category 체크리스트
- [ ] 테스트 10개 추가
- **총 LOC**: ~1,150

---

## Phase 6: Documentation (Week 10)

**목표**: 새 기여자가 코드를 이해하고 기여할 수 있는 문서.

| 문서 | 내용 | 분량 |
|------|------|:----:|
| ARCHITECTURE.md | 에이전트 팀 구조, PDCA 모델, 모듈 의존성, 상태 관리, 보안 경계 | 400줄 |
| CONTRIBUTING.md | 셋업, 테스트, 커밋 컨벤션, 리뷰 프로세스, 스킬 개발 가이드 | 300줄 |
| docs/SECURITY.md | CSO 14-phase 설명, 가드레일 규칙, 비밀 관리 | 200줄 |

**합계**: ~900줄 (문서)

### Phase 6 산출물
- [ ] ARCHITECTURE.md
- [ ] CONTRIBUTING.md
- [ ] docs/SECURITY.md

---

## Phase 7: Polish (Week 11)

**목표**: 통합 테스트 + 성능 최적화 + 최종 QA.

| 작업 | 내용 | LOC |
|------|------|:---:|
| 통합 테스트 | 전체 워크플로우 (plan→review→ship) 단대단 | 500 |
| 성능 최적화 | hook 응답 시간 <5ms 검증, 메모리 프로파일링 | 200 |
| 코드 정리 | JSDoc 14개 함수, 긴 함수 3개 분할 | 300 |
| 최종 QA | 전체 테스트 스위트 실행 + 회귀 체크 | 0 |

**합계**: ~1,000 LOC

### Phase 7 산출물
- [ ] 전체 139+ 테스트 ALL PASS
- [ ] Hook 응답 <5ms
- [ ] JSDoc 100% 커버리지 (신규 모듈)
- [ ] v3.0.0 릴리즈 준비 완료

---

## 총계 요약

| Phase | 기간 | 신규 LOC | 신규 테스트 | 핵심 산출물 |
|:-----:|:----:|:--------:|:----------:|------------|
| 1 | 2주 | 2,420 | 14 | Ship 구현 + QA 엔진 |
| 2 | 2주 | 2,280 | 24 | 18-cat Review + Pre-landing |
| 3 | 2주 | 3,880 | 94 | E2E 71개 + 유닛 23개 |
| 4 | 1.5주 | 1,130 | 8 | Safety 5 skill + Canary |
| 5 | 1.5주 | 1,150 | 10 | CLI 5개 + Design checklist |
| 6 | 1주 | 900 (문서) | 0 | ARCHITECTURE + CONTRIBUTING |
| 7 | 1주 | 1,000 | 5 | 통합 테스트 + Polish |
| **Total** | **11주** | **~12,760** | **155** | **v3.0.0** |

---

## v3.0.0 목표 달성 기준

```
기능 완성도:
  [ ] Ship 7-step 실제 실행
  [ ] QA health score + fix loop + regression
  [ ] Review 18-category 체크리스트
  [ ] CEO/Eng/Design 독립 리뷰
  [ ] Pre-landing review (ship step 4)
  [ ] Safety 5 skill (careful/guard/freeze/unfreeze/canary)
  [ ] CLI 5개 유틸리티
  [ ] Design 6-category 체크리스트

테스트 완성도:
  [ ] 139+ 테스트 (기존 45 + 신규 94+)
  [ ] E2E 15+ (71 목표)
  [ ] 커버리지 40%+

문서 완성도:
  [ ] ARCHITECTURE.md (400줄)
  [ ] CONTRIBUTING.md (300줄)
  [ ] docs/SECURITY.md (200줄)
  [ ] docs/USER-GUIDE.md (있음)
  [ ] README.md (있음)

gstack 능가 지표:
  [ ] Review 깊이: 18 categories (gstack 동일)
  [ ] Ship 실행: 7-step 완전 구현 (gstack 동일)
  [ ] QA 점수: health score + fix loop (gstack 동일)
  [ ] 에이전트: 15명 병렬 (gstack 0명) ← 능가
  [ ] PDCA: 5-stage 강제 (gstack 없음) ← 능가
  [ ] Model routing: 비용 30-40% 절감 (gstack 없음) ← 능가
  [ ] Self-healing: circuit breaker (gstack 없음) ← 능가
  [ ] Cross-session learning: eureka (gstack 없음) ← 능가
  [ ] Intent routing: 11-route 자연어 (gstack 없음) ← 능가
```

---

## gstack 대비 최종 포지셔닝

```
gstack: "28개 독립 스킬이 각각 잘 동작하는 도구 모음"
  강점: 워크플로우 완성도, 브라우저 자동화, 테스트 인프라
  약점: 에이전트 없음, PDCA 없음, 학습 없음, 비용 최적화 없음

aing v3.0: "15명 에이전트가 PDCA 사이클로 협업하는 구조화된 팀"
  강점: 에이전트 병렬화, PDCA 강제, 비용 최적화, 자가 치유, 학습
  v3.0 추가: gstack 수준 워크플로우 깊이 (ship, QA, review, safety)

결론: gstack의 "넓이"를 흡수하되, aing의 "깊이"(구조)를 유지
  → 넓이 + 깊이 = 능가
```
