---
name: review-code
description: "🛡️ Milla 에이전트로 코드 리뷰. 버그, 보안, 품질 점검."
triggers: ["review", "리뷰", "검토", "코드리뷰"]
---

# /swkit review — Code Review

## Usage
```
/swkit review
/swkit review src/auth/
```

## Agent Deployment

Before spawning the agent, ALWAYS announce:

```
[sw-kit] Milla(Security/sonnet) 투입 — 코드 리뷰
```

🛡️ Milla (sonnet) 에이전트가 코드를 리뷰합니다.
- 버그, 로직 오류
- 보안 취약점 (OWASP Top 10)
- 성능 안티패턴
- 컨벤션 위반
