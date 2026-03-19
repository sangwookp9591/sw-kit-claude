---
name: rollback
description: "📌 Git 체크포인트 기반 롤백. 검증 실패 시 안전하게 복구."
triggers: ["rollback", "롤백", "되돌리기", "undo", "복구"]
---

# /swkit rollback — Git Checkpoint Rollback

## Usage
- `/swkit rollback` — 마지막 체크포인트로 롤백
- 비파괴적: 새 브랜치를 생성하고, 변경사항은 git stash에 보존

## How it works
1. 파이프라인 실행 전 자동 체크포인트 생성
2. Milla 리뷰에서 Critical 발견 시 롤백 제안
3. 롤백 시 새 브랜치 생성 (swkit-rollback-*)
4. 이전 변경사항은 stash에 보존
