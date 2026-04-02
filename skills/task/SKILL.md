---
name: task
description: "📋 Task 체크리스트 관리. Main Task → Sub Tasks 계층 추적. Plan에서 자동 변환 지원."
triggers: ["task", "태스크", "체크리스트", "checklist", "할일"]
---

# /aing:task — Task Checklist Manager

## Actions

| 명령 | 설명 |
|------|------|
| `/aing:task create <title> --subtasks "s1, s2, s3"` | 태스크 생성 |
| `/aing:task from-plan [plan-path]` | 플랜의 Steps를 태스크로 변환 |
| `/aing:task check <task-id> <seq>` | 서브태스크 완료 체크 ☐→☑ |
| `/aing:task list` | 전체 태스크 목록 |
| `/aing:task show <task-id>` | 상세 체크리스트 |
| `/aing:task add <task-id> "subtask title"` | 서브태스크 추가 |

## Implementation

### create

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/scripts/task/task-cli.js" create --title "<title>" --subtasks "<s1>,<s2>,<s3>" --dir "$(pwd)"
```

task-cli.js가 없으면 오케스트레이터가 직접 `.aing/tasks/task-{id}.json`에 Write:

```json
{
  "id": "task-{timestamp}",
  "title": "<title>",
  "feature": null,
  "description": "",
  "status": "in-progress",
  "createdAt": "<ISO>",
  "updatedAt": "<ISO>",
  "completedAt": null,
  "subtasks": [
    { "id": "sub-1", "seq": 1, "title": "<s1>", "description": "", "status": "pending", "checkedAt": null },
    { "id": "sub-2", "seq": 2, "title": "<s2>", "description": "", "status": "pending", "checkedAt": null }
  ]
}
```

### from-plan

플랜 파일에서 Steps를 추출하여 자동으로 태스크를 생성한다.

1. `plan-path`가 없으면 `.aing/plans/`에서 가장 최근 플랜 파일을 Read
2. `## Steps` 섹션에서 각 step을 파싱
3. `create`와 동일한 방식으로 태스크 생성
4. 생성 결과를 체크리스트 포맷으로 표시

```
# from-plan 파싱 예시
## Steps
1. JWT 미들웨어 추가 — files: src/auth.ts, agent: Jay
2. 테스트 작성 — files: tests/auth.test.ts, agent: Derek

→ subtasks: ["JWT 미들웨어 추가 (src/auth.ts)", "테스트 작성 (tests/auth.test.ts)"]
```

### check

1. `.aing/tasks/{task-id}.json`을 Read
2. `subtasks[seq-1].status`를 `"done"`으로, `checkedAt`을 현재 시각으로 설정
3. 전체 완료 시 `status`를 `"completed"`로 변경
4. 업데이트된 체크리스트 표시

### list

`.aing/tasks/`의 모든 JSON 파일을 읽어 테이블로 표시:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  aing tasks
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  task-001  사용자 인증 API    3/5 (60%)  in-progress
  task-002  가드레일 추가       2/2 (100%) completed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### show

특정 태스크의 상세 체크리스트:

```
📋 {title} ({progress}%)
━━━━━━━━━━━━━━━━━━━━
  ☑ 1. {subtask1} (13:20:05)
  ☑ 2. {subtask2} (13:25:10)
  ☐ 3. {subtask3}
━━━━━━━━━━━━━━━━━━━━
  Progress: {done}/{total} ({percent}%)
```

## Storage

- 태스크 파일: `.aing/tasks/task-{id}.json`
- 태스크 인덱스: `.aing/tasks/index.json` (선택 — list 성능 최적화)
- plan의 persist.js가 생성한 태스크도 동일 포맷
