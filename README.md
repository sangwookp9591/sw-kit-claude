# sw-kit — Harness Engineering Agent

> **개발자에게는 최고의 도우미, 비개발자에게는 최고의 마술사.**

AI 네이티브 시대의 개발 하네스. 구조화된 워크플로우, 지능형 컨텍스트, 자기 학습 에이전트.

```
40 modules | 148KB | 4,601 LOC | 30/30 tests ✓ | 5ms hook response | 0 dependencies
```

---

## Install

Claude Code 세션에서:
```
/plugin marketplace add sangwookp9591/sw-kit-claude
/plugin install sw-kit
```

또는 터미널에서:
```bash
claude plugin marketplace add sangwookp9591/sw-kit-claude && claude plugin install sw-kit
```

## Update

```
/plugin update sw-kit
```

---

## Agent Team (12명)

```
👑 CTO
  👑 Sam        총괄 리더              [opus]

🎯 기획
  🎯 Able       PM / 기획              [sonnet]
  📐 Klay       Architect / 설계       [opus]

⚙️ Backend
  ⚙️ Jay        API 개발               [sonnet]
  🗄️ Jerry      DB / 인프라            [sonnet]
  🔒 Milla      보안 / 인증            [sonnet]

🎨 Design
  🎨 Willji     UI·UX 디자인           [sonnet]

🖥️ Frontend
  🖥️ Derek      화면 구현              [sonnet]
  ✨ Rowan      인터랙션 / 애니메이션   [sonnet]

🔧 Ops
  🔍 Scout      코드베이스 탐색         [haiku]
  ✅ Proof      증거 기반 검증          [haiku]

🪄 Magic
  🪄 Iron       비개발자 마법사         [sonnet]
```

## Cost-Aware Team Presets

작업 복잡도에 따라 최적 팀이 **자동으로** 구성됩니다:

| Preset | 인원 | 비용 | 용도 |
|--------|:---:|------|------|
| 🟢 Solo | 1명 | ~15K tokens | 버그 수정, 단일 파일 변경 |
| 🟡 Duo | 2명 | ~18K tokens | 중간 기능, API 추가 |
| 🟠 Squad | 4명 | ~48K tokens | 풀스택, 다중 도메인 |
| 🔴 Full | 7명 | ~123K tokens | 아키텍처 변경, 보안 민감 |

---

## 5 Innovations

| # | Innovation | Description |
|---|-----------|-------------|
| 1 | **Context Budget** | 토큰 소비를 추적하고 예산 내에서 최적화 (~근사치) |
| 2 | **Cross-Session Learning** | 성공 패턴을 캡처하여 다음 세션에 자동 적용 |
| 3 | **Adaptive Routing** | 작업 복잡도에 따라 최적 모델 자동 선택 (haiku/sonnet/opus) |
| 4 | **Evidence Chain** | 테스트/빌드/린트 결과를 체인으로 연결하여 완료 증명 |
| 5 | **Self-Healing** | 장애 자동 감지/복구, 서킷 브레이커로 반복 실패 차단 |

## Harness Engineering 4-Axis (90.5/100)

| Axis | Score | What it does |
|------|:-----:|-------------|
| **Constrain** | 92 | Guardrail 7규칙, Safety Invariants 5종, Cost Ceiling, Dry-Run |
| **Inform** | 90 | Context Budget, Progress Tracker, Convention Extractor, Compaction |
| **Verify** | 90 | TDD Engine (🔴→🟢→🔵), Evidence Chain, Agent Trace, 30/30 Tests |
| **Correct** | 90 | Self-Healing, Circuit Breaker, Git Rollback, Auto Team Recovery |

---

## Quick Start

```bash
# PDCA 사이클 시작
/swkit start my-feature

# 전체 파이프라인 자동 실행
/swkit auto my-feature "JWT 인증 구현"

# 비개발자 마술사 모드
/swkit wizard
```

## Commands

### PDCA
| Command | Description |
|---------|-------------|
| `/swkit start <name>` | PDCA 사이클 시작 |
| `/swkit status` | 현재 상태 확인 |
| `/swkit next` | 다음 단계 진행 |
| `/swkit reset <name>` | 초기화 |

### TDD
| Command | Description |
|---------|-------------|
| `/swkit tdd start <feature> <target>` | TDD 사이클 시작 (🔴 RED) |
| `/swkit tdd check <pass\|fail>` | 테스트 결과 기록, 페이즈 전환 |
| `/swkit tdd status` | 현재 TDD 페이즈 |

### Task
| Command | Description |
|---------|-------------|
| `/swkit task create <title>` | Main Task + Sub Tasks 생성 |
| `/swkit task check <id> <seq>` | 서브태스크 완료 체크 ☐→☑ |
| `/swkit task list` | 전체 태스크 목록 |

### Agent
| Command | Description |
|---------|-------------|
| `/swkit explore <target>` | 🔍 Scout — 코드 탐색 |
| `/swkit plan <task>` | 📋 Archie — 계획 수립 |
| `/swkit execute <task>` | ⚡ Bolt — 코드 구현 |
| `/swkit review` | 🛡️ Shield — 코드 리뷰 |
| `/swkit verify` | ✅ Proof — 증거 검증 |
| `/swkit wizard` | 🪄 Iron — 마술사 모드 |

### Pipeline
| Command | Description |
|---------|-------------|
| `/swkit auto <feature> <task>` | 🚀 전체 자동 실행 |
| `/swkit rollback` | 📌 체크포인트 롤백 |

### Utility
| Command | Description |
|---------|-------------|
| `/swkit learn show` | 🧠 학습 기록 조회 |
| `/swkit help` | ❓ 도움말 |

## Multilingual

한국어와 영어를 자동 감지합니다:

```
"계획 세워줘"  → Plan 단계 트리거
"검증해줘"    → Check 단계 트리거
"만들어줘"    → Iron 마술사 모드 활성화
```

---

## Architecture

```
.sw-kit/                    ← 런타임 데이터 (gitignore)
├── state/                  ← PDCA, TDD, invariants, pipeline, circuit-breaker
├── tasks/                  ← 체크리스트 (main → sub tasks)
├── plans/                  ← 계획서 문서
├── snapshots/              ← 컴팩션 스냅샷
├── reports/                ← 완료 보고서
├── logs/                   ← 구조화된 로그 (JSONL)
├── routing-history.json    ← 적응형 라우팅 기록
└── project-memory.json     ← 교차 세션 학습

hooks-handlers/             ← 7개 훅 핸들러
scripts/
├── core/                   ← state, config, logger, context-budget, display
├── guardrail/              ← guardrail-engine, safety-invariants, cost-ceiling,
│                              dry-run, progress-tracker, convention-extractor
├── pdca/                   ← pdca-engine (5-Stage)
├── routing/                ← complexity-scorer, model-router, routing-history
├── memory/                 ← project-memory, learning-capture
├── evidence/               ← evidence-collector, evidence-chain, evidence-report
├── recovery/               ← health-check, recovery-engine, circuit-breaker
├── trace/                  ← agent-trace
├── compaction/             ← context-compaction (priority-based)
├── pipeline/               ← agent-pipeline, rollback, team-orchestrator
├── tdd/                    ← tdd-engine (Red→Green→Refactor)
├── task/                   ← task-manager, plan-manager
└── i18n/                   ← intent-detector, locale
```

## Performance

| Metric | Result |
|--------|--------|
| Hook response | **5ms** (budget: 5,000ms) |
| Config cold start | **36ms** |
| Test suite | **30/30 ALL GREEN** |
| Dependencies | **0** |

## Requirements

- Claude Code v2.1.69+
- Node.js v18+

## License

Apache-2.0
