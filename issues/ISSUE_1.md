# ISSUE LIST 4

## 1. 병렬처리안함 Jay 또는 특정 분야 Agent가 처리하기 벅찬부분은 또는 양이 많아서 병렬로 처리해야하는 부분은 /harness를 사용해서 하위 subgent를 생성해서 병렬 처리.

## 2. 작업은 다 완료 했다고 했는데. checklist check 안돼고 있음. completedAt, checkedAt , status - task hooking 처리 확인.

1. .aing/tasks/\_index.json

```
[
  {
    "id": "task-1775179420274-1",
    "title": "[Plan] zide — tmux + Neovim/Helix + AI Supervisor TUI",
    "status": "in-progress",
    "updatedAt": "2026-04-03T01:23:40.275Z"
  }
]
```

2. .aing/tasks/task-1775179420274-1.json

```
{
  "id": "task-1775179420274-1",
  "title": "[Plan] zide — tmux + Neovim/Helix + AI Supervisor TUI",
  "feature": "zide — tmux + Neovim/Helix + AI Supervisor TUI",
  "description": "Go single binary TUI. tmux control mode pane orchestration, Neovim 통합, AI 멀티모델 라우팅, git worktree sandbox, SQLite WAL 상태 관리. MVP: room create -> ai ask -> patch review -> check run -> handoff create.",
  "status": "in-progress",
  "createdAt": "2026-04-03T01:23:40.274Z",
  "updatedAt": "2026-04-03T01:23:40.274Z",
  "completedAt": null,
  "subtasks": [
    {
      "id": "task-1775179420274-1-sub-1",
      "seq": 1,
      "title": "Step 1: Project Scaffold + Build System + Dependency Direction Contract — files: cmd/zide/main.go, go.mod, go.sum, Makefile, internal/version/version.go, .goreleaser.yml, internal/domain/interfaces.go, internal/domain/types.go, internal/domain/errors.go, .golangci.yml; agent: Jay; completeness: 8/10",
      "description": "",
      "status": "pending",
      "checkedAt": null
    },
    {
      "id": "task-1775179420274-1-sub-2",
      "seq": 2,
      "title": "Step 2: SQLite Store + WAL Bootstrap — files: internal/store/db.go, internal/store/migrations/, internal/store/writer.go, internal/store/store_test.go; agent: Jay; completeness: 9/10",
      "description": "",
      "status": "pending",
      "checkedAt": null
    },
    {
      "id": "task-1775179420274-1-sub-3",
      "seq": 3,
      "title": "Step 3: TOML Config Loader — files: internal/config/config.go, internal/config/config_test.go, internal/config/defaults.toml; agent: Jay; completeness: 8/10",
      "description": "",
      "status": "pending",
      "checkedAt": null
    },
    {
      "id": "task-1775179420274-1-sub-4",
      "seq": 4,
      "title": "Step 4: tmux Control Mode Driver — files: internal/tmux/control.go, internal/tmux/session.go, internal/tmux/pane.go, internal/tmux/layout.go, internal/tmux/tmux_test.go, internal/tmux/parser.go, internal/tmux/parser_test.go, internal/tmux/version.go; agent: Jay; completeness: 8/10",
      "description": "",
      "status": "pending",
      "checkedAt": null
    },
    {
      "id": "task-1775179420274-1-sub-5",
      "seq": 5,
      "title": "Step 5: Bubble Tea TUI Shell + Live HUD — files: internal/tui/app.go, internal/tui/hud.go, internal/tui/styles.go, internal/tui/keymap.go; agent: Derek; completeness: 7/10",
      "description": "",
      "status": "pending",
      "checkedAt": null
    },
    {
      "id": "task-1775179420274-1-sub-6",
      "seq": 6,
      "title": "Step 6: Neovim RPC Integration — files: internal/editor/nvim.go, internal/editor/rpc.go, internal/editor/editor.go, internal/editor/nvim_test.go, internal/editor/spike_report.md; agent: Jay; completeness: 7/10",
      "description": "",
      "status": "pending",
      "checkedAt": null
    },
    {
      "id": "task-1775179420274-1-sub-7",
      "seq": 7,
      "title": "Step 7: Git Worktree Manager — files: internal/git/worktree.go, internal/git/worktree_test.go, internal/git/git.go; agent: Jay; completeness: 9/10",
      "description": "",
      "status": "pending",
      "checkedAt": null
    },
    {
      "id": "task-1775179420274-1-sub-8",
      "seq": 8,
      "title": "Step 8: Task Room Lifecycle — files: internal/room/room.go, internal/room/manager.go, internal/room/room_test.go, internal/store/migrations/002_rooms.up.sql, internal/store/migrations/002_rooms.down.sql; agent: Jay; completeness: 8/10",
      "description": "",
      "status": "pending",
      "checkedAt": null
    },
    {
      "id": "task-1775179420274-1-sub-9",
      "seq": 9,
      "title": "Step 9: AI Provider Adapter Layer — files: internal/ai/provider.go, internal/ai/openai/adapter.go, internal/ai/anthropic/adapter.go, internal/ai/streaming.go, internal/ai/ratelimit.go, internal/ai/ai_test.go; agent: Jay; completeness: 8/10",
      "description": "",
      "status": "pending",
      "checkedAt": null
    },
    {
      "id": "task-1775179420274-1-sub-10",
      "seq": 10,
      "title": "Step 10: Model Router (Explicit) — files: internal/router/router.go, internal/router/router_test.go; agent: Jay; completeness: 7/10",
      "description": "",
      "status": "pending",
      "checkedAt": null
    },
    {
      "id": "task-1775179420274-1-sub-11",
      "seq": 11,
      "title": "Step 11: Context Lattice 3-Layer — files: internal/context/lattice.go, internal/context/scope.go, internal/context/lattice_test.go, internal/context/bench_test.go, internal/store/migrations/003_context.up.sql, internal/store/migrations/003_context.down.sql; agent: Jay; completeness: 8/10",
      "description": "",
      "status": "pending",
      "checkedAt": null
    },
    {
      "id": "task-1775179420274-1-sub-12",
      "seq": 12,
      "title": "Step 12: Patch Inbox + Hunk Atomic Apply — files: internal/patch/inbox.go, internal/patch/hunk.go, internal/patch/apply.go, internal/patch/patch_test.go, internal/store/migrations/004_patches.up.sql, internal/store/migrations/004_patches.down.sql; agent: Jay; completeness: 9/10",
      "description": "",
      "status": "pending",
      "checkedAt": null
    },
    {
      "id": "task-1775179420274-1-sub-13",
      "seq": 13,
      "title": "Step 13: Evidence Rail (JSONL) — files: internal/evidence/rail.go, internal/evidence/rail_test.go; agent: Jay; completeness: 7/10",
      "description": "",
      "status": "pending",
      "checkedAt": null
    },
    {
      "id": "task-1775179420274-1-sub-14",
      "seq": 14,
      "title": "Step 14: AI Chat Pane (TUI) — files: internal/tui/chat.go, internal/tui/chat_model.go, internal/tui/message.go; agent: Derek; completeness: 8/10",
      "description": "",
      "status": "pending",
      "checkedAt": null
    },
    {
      "id": "task-1775179420274-1-sub-15",
      "seq": 15,
      "title": "Step 15: Patch Review Pane (TUI) — files: internal/tui/patch_review.go, internal/tui/diff_view.go; agent: Derek; completeness: 8/10",
      "description": "",
      "status": "pending",
      "checkedAt": null
    },
    {
      "id": "task-1775179420274-1-sub-16",
      "seq": 16,
      "title": "Step 16: Check Runner Integration — files: internal/check/runner.go, internal/check/check.go, internal/check/runner_test.go; agent: Jay; completeness: 7/10",
      "description": "",
      "status": "pending",
      "checkedAt": null
    },
    {
      "id": "task-1775179420274-1-sub-17",
      "seq": 17,
      "title": "Step 17: Handoff Create — files: internal/handoff/handoff.go, internal/handoff/handoff_test.go; agent: Jay; completeness: 7/10",
      "description": "",
      "status": "pending",
      "checkedAt": null
    },
    {
      "id": "task-1775179420274-1-sub-18",
      "seq": 18,
      "title": "Step 18: MVP E2E Integration — files: internal/integration/mvp_test.go, scripts/e2e.sh, scripts/ci-tmux-matrix.sh; agent: Jay (QA); completeness: 9/10",
      "description": "",
      "status": "pending",
      "checkedAt": null
    }
  ]
}
```

## 3. team session 팀 사용중인 Agent 5개 인데 Agent-tract unknown으로 나옴.

1. .aing/state/team-session.json
   {"feature":"zide-terminal-ai-ide","mode":"team","currentStage":"team-fix","agents":{"exec":["jay","derek"],"verify":["milla","sam"],"architect":["klay"]},"startedAt":"2026-04-03T12:00:00Z","fixRound":1}

2. .aing/state/agent-trace.json

```
   {
   "agents": [
   {
   "id": "unknown-04952148",
   "name": "unknown",
   "subagentType": "unknown",
   "model": "sonnet",
   "description": "",
   "spawnedAt": "2026-04-03T00:49:52.148Z",
   "status": "completed",
   "completedAt": "2026-04-03T00:50:42.144Z",
   "durationMs": 49998
   },
   {
   "id": "unknown-05121602",
   "name": "unknown",
   "subagentType": "unknown",
   "model": "sonnet",
   "description": "",
   "spawnedAt": "2026-04-03T00:51:21.602Z",
   "status": "completed",
   "completedAt": "2026-04-03T00:58:20.920Z",
   "durationMs": 419320
   },
   {
   "id": "unknown-05911977",
   "name": "unknown",
   "subagentType": "unknown",
   "model": "sonnet",
   "description": "",
   "spawnedAt": "2026-04-03T00:59:11.977Z",
   "status": "completed",
   "completedAt": "2026-04-03T01:01:14.655Z",
   "durationMs": 122680
   },
   {
   "id": "unknown-10146934",
   "name": "unknown",
   "subagentType": "unknown",
   "model": "sonnet",
   "description": "",
   "spawnedAt": "2026-04-03T01:01:46.934Z",
   "status": "completed",
   "completedAt": "2026-04-03T01:08:18.101Z",
   "durationMs": 391169
   },
   {
   "id": "unknown-10908917",
   "name": "unknown",
   "subagentType": "unknown",
   "model": "sonnet",
   "description": "",
   "spawnedAt": "2026-04-03T01:09:08.917Z",
   "status": "completed",
   "completedAt": "2026-04-03T01:09:45.419Z",
   "durationMs": 36504
   },
   {
   "id": "unknown-11023576",
   "name": "unknown",
   "subagentType": "unknown",
   "model": "sonnet",
   "description": "",
   "spawnedAt": "2026-04-03T01:10:23.576Z",
   "status": "completed",
   "completedAt": "2026-04-03T01:13:39.151Z",
   "durationMs": 195578
   },
   {
   "id": "unknown-11445208",
   "name": "unknown",
   "subagentType": "unknown",
   "model": "sonnet",
   "description": "",
   "spawnedAt": "2026-04-03T01:14:45.208Z",
   "status": "completed",
   "completedAt": "2026-04-03T01:15:35.147Z",
   "durationMs": 49942
   },
   {
   "id": "unknown-11556669",
   "name": "unknown",
   "subagentType": "unknown",
   "model": "sonnet",
   "description": "",
   "spawnedAt": "2026-04-03T01:15:56.669Z",
   "status": "completed",
   "completedAt": "2026-04-03T01:16:48.866Z",
   "durationMs": 52200
   },
   {
   "id": "unknown-11727336",
   "name": "unknown",
   "subagentType": "unknown",
   "model": "sonnet",
   "description": "",
   "spawnedAt": "2026-04-03T01:17:27.336Z",
   "status": "completed",
   "completedAt": "2026-04-03T01:23:29.025Z",
   "durationMs": 361691
   },
   {
   "id": "unknown-12658112",
   "name": "unknown",
   "subagentType": "unknown",
   "model": "sonnet",
   "description": "",
   "spawnedAt": "2026-04-03T01:26:58.112Z",
   "status": "completed",
   "completedAt": "2026-04-03T01:38:38.240Z",
   "durationMs": 700131
   },
   {
   "id": "unknown-13907658",
   "name": "unknown",
   "subagentType": "unknown",
   "model": "sonnet",
   "description": "",
   "spawnedAt": "2026-04-03T01:39:07.658Z",
   "status": "completed",
   "completedAt": "2026-04-03T01:45:27.260Z",
   "durationMs": 379605
   },
   {
   "id": "unknown-13915255",
   "name": "unknown",
   "subagentType": "unknown",
   "model": "sonnet",
   "description": "",
   "spawnedAt": "2026-04-03T01:39:15.255Z",
   "status": "completed",
   "completedAt": "2026-04-03T01:44:31.184Z",
   "durationMs": 315932
   },
   {
   "id": "unknown-13928267",
   "name": "unknown",
   "subagentType": "unknown",
   "model": "sonnet",
   "description": "",
   "spawnedAt": "2026-04-03T01:39:28.267Z",
   "status": "completed",
   "completedAt": "2026-04-03T01:43:13.024Z",
   "durationMs": 224760
   },
   {
   "id": "unknown-13940204",
   "name": "unknown",
   "subagentType": "unknown",
   "model": "sonnet",
   "description": "",
   "spawnedAt": "2026-04-03T01:39:40.204Z",
   "status": "completed",
   "completedAt": "2026-04-03T01:43:01.457Z",
   "durationMs": 201256
   },
   {
   "id": "unknown-13951175",
   "name": "unknown",
   "subagentType": "unknown",
   "model": "sonnet",
   "description": "",
   "spawnedAt": "2026-04-03T01:39:51.175Z",
   "status": "completed",
   "completedAt": "2026-04-03T01:40:55.417Z",
   "durationMs": 64244
   },
   {
   "id": "unknown-14600420",
   "name": "unknown",
   "subagentType": "unknown",
   "model": "sonnet",
   "description": "",
   "spawnedAt": "2026-04-03T01:46:00.420Z",
   "status": "completed",
   "completedAt": "2026-04-03T01:55:05.991Z",
   "durationMs": 545574
   },
   {
   "id": "unknown-14611505",
   "name": "unknown",
   "subagentType": "unknown",
   "model": "sonnet",
   "description": "",
   "spawnedAt": "2026-04-03T01:46:11.505Z",
   "status": "completed",
   "completedAt": "2026-04-03T01:51:49.963Z",
   "durationMs": 338461
   },
   {
   "id": "unknown-14622878",
   "name": "unknown",
   "subagentType": "unknown",
   "model": "sonnet",
   "description": "",
   "spawnedAt": "2026-04-03T01:46:22.878Z",
   "status": "completed",
   "completedAt": "2026-04-03T01:51:04.116Z",
   "durationMs": 281242
   },
   {
   "id": "unknown-14634526",
   "name": "unknown",
   "subagentType": "unknown",
   "model": "sonnet",
   "description": "",
   "spawnedAt": "2026-04-03T01:46:34.526Z",
   "status": "completed",
   "completedAt": "2026-04-03T01:50:28.496Z",
   "durationMs": 233973
   },
   {
   "id": "unknown-14643569",
   "name": "unknown",
   "subagentType": "unknown",
   "model": "sonnet",
   "description": "",
   "spawnedAt": "2026-04-03T01:46:43.569Z",
   "status": "completed",
   "completedAt": "2026-04-03T01:50:25.620Z",
   "durationMs": 222054
   },
   {
   "id": "unknown-15538957",
   "name": "unknown",
   "subagentType": "unknown",
   "model": "sonnet",
   "description": "",
   "spawnedAt": "2026-04-03T01:55:38.957Z",
   "status": "completed",
   "completedAt": "2026-04-03T01:59:51.858Z",
   "durationMs": 252903
   },
   {
   "id": "unknown-15548666",
   "name": "unknown",
   "subagentType": "unknown",
   "model": "sonnet",
   "description": "",
   "spawnedAt": "2026-04-03T01:55:48.666Z",
   "status": "completed",
   "completedAt": "2026-04-03T01:58:16.048Z",
   "durationMs": 147384
   },
   {
   "id": "unknown-20013203",
   "name": "unknown",
   "subagentType": "unknown",
   "model": "sonnet",
   "description": "",
   "spawnedAt": "2026-04-03T02:00:13.203Z",
   "status": "completed",
   "completedAt": "2026-04-03T02:06:50.303Z",
   "durationMs": 397103
   },
   {
   "id": "unknown-20020985",
   "name": "unknown",
   "subagentType": "unknown",
   "model": "sonnet",
   "description": "",
   "spawnedAt": "2026-04-03T02:00:20.985Z",
   "status": "completed",
   "completedAt": "2026-04-03T02:06:26.128Z",
   "durationMs": 365149
   },
   {
   "id": "unknown-20029948",
   "name": "unknown",
   "subagentType": "unknown",
   "model": "sonnet",
   "description": "",
   "spawnedAt": "2026-04-03T02:00:29.948Z",
   "status": "completed",
   "completedAt": "2026-04-03T02:03:42.917Z",
   "durationMs": 192972
   },
   {
   "id": "unknown-20037827",
   "name": "unknown",
   "subagentType": "unknown",
   "model": "sonnet",
   "description": "",
   "spawnedAt": "2026-04-03T02:00:37.827Z",
   "status": "completed",
   "completedAt": "2026-04-03T02:02:34.142Z",
   "durationMs": 116319
   },
   {
   "id": "unknown-20732597",
   "name": "unknown",
   "subagentType": "unknown",
   "model": "sonnet",
   "description": "",
   "spawnedAt": "2026-04-03T02:07:32.597Z",
   "status": "completed",
   "completedAt": "2026-04-03T02:14:45.331Z",
   "durationMs": 432738
   },
   {
   "id": "unknown-21534033",
   "name": "unknown",
   "subagentType": "unknown",
   "model": "sonnet",
   "description": "",
   "spawnedAt": "2026-04-03T02:15:34.033Z",
   "status": "completed",
   "completedAt": "2026-04-03T02:18:27.030Z",
   "durationMs": 173000
   },
   {
   "id": "unknown-21545206",
   "name": "unknown",
   "subagentType": "unknown",
   "model": "sonnet",
   "description": "",
   "spawnedAt": "2026-04-03T02:15:45.206Z",
   "status": "completed",
   "completedAt": "2026-04-03T02:17:44.857Z",
   "durationMs": 119654
   },
   {
   "id": "unknown-21912654",
   "name": "unknown",
   "subagentType": "unknown",
   "model": "sonnet",
   "description": "",
   "spawnedAt": "2026-04-03T02:19:12.654Z",
   "status": "active"
   }
   ],
   "activeCount": 1,
   "totalSpawned": 30
   }
```

## 위 과정이 제대로 안물리니깐 완성도 있는 코드가 안나옴. 테스크 정확히 수행 못함. (harness 팀 위반)
