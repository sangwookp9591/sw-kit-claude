---
name: plan-task
description: "📋 Able 에이전트로 작업 계획 수립. .sw-kit/plans/ 저장 + Task 자동 생성."
triggers: ["plan", "계획", "기획", "설계"]
---

# /swkit plan — Task Planning

## Usage
```
/swkit plan <task-description>
/swkit plan "사용자 인증 API 구현"
```

## Agent Deployment

Before spawning the agent, ALWAYS announce:

```
[sw-kit] Able(PM/sonnet) 투입 — 작업 계획 수립
```

📋 Able (sonnet) 에이전트가 계획을 수립하고 .sw-kit/plans/에 저장합니다.
Task 체크리스트도 자동 생성됩니다.
