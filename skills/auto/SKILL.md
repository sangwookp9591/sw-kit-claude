---
name: auto
description: "🚀 전체 파이프라인 자동 실행. Scout→Archie→Bolt→Shield→Proof."
triggers: ["auto", "자동", "파이프라인", "pipeline", "자동 실행"]
---

# /swkit auto — Full Pipeline Automation

Scout(탐색) → Archie(계획) → Bolt(구현) → Shield(리뷰) → Proof(검증)

자동으로 전체 PDCA 사이클 + TDD + 증거 체인까지 실행합니다.

## Usage
```
/swkit auto <feature> <task-description>
```

## What happens
1. 🔍 Scout가 코드베이스 구조 탐색
2. 📋 Archie가 작업 계획 수립 + Task 체크리스트 생성
3. ⚡ Bolt가 TDD로 코드 구현 (Red→Green→Refactor)
4. 🛡️ Shield가 코드 리뷰 + 보안 점검
5. ✅ Proof가 증거 체인으로 완료 증명
