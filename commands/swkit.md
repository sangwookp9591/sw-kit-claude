---
name: swkit
description: sw-kit 하네스 엔지니어링 워크플로우. start, status, next, reset, explore, plan, execute, review, verify, wizard 액션을 지원합니다.
---

# /swkit — Harness Engineering Workflow

## PDCA Actions

### `/swkit start <feature-name>`
새로운 PDCA 사이클을 시작합니다.
1. Plan 단계로 진입
2. `templates/plan.md` 기반 계획서 생성
3. `.sw-kit/state/pdca-status.json`에 상태 저장

### `/swkit status`
현재 PDCA 상태를 표시합니다.
- Active feature, current stage, iteration count
- Evidence chain summary
- Progress indicator

### `/swkit next`
다음 PDCA 단계로 진행합니다.
- 현재 단계의 수락 기준 확인
- 증거 수집 (test/build/lint 결과)
- 자동 단계 전환

### `/swkit reset <feature-name>`
PDCA 사이클을 초기화합니다.

## Agent Actions

### `/swkit explore <target>`
Explorer 에이전트로 코드베이스를 탐색합니다.

### `/swkit plan <task>`
Planner 에이전트로 작업 계획을 수립합니다.

### `/swkit execute <task>`
Executor 에이전트로 코드를 구현합니다.

### `/swkit review [scope]`
Reviewer 에이전트로 코드를 검토합니다.

### `/swkit verify [feature]`
Verifier 에이전트로 완료를 증명합니다.

### `/swkit wizard`
비개발자를 위한 마술사 모드를 시작합니다.

### `/swkit learn [show|clear]`
교차 세션 학습 기록을 관리합니다.

## Stage Flow
```
plan → do → check → act (iterate if <90%) → review → completed
```
