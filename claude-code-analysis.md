# Claude Code 소스 코드 심층 분석

> Anthropic의 Claude Code 전체 소스 코드에 대한 구조, 기능, 동작 흐름 분석서입니다.  
> 유출된 소스 코드는 단 한 줄도 직접 공개하지 않으며, 전체 구조와 동작 흐름을 중심으로 분석합니다.

---

## 요약: 세 문장으로 이해하기

1. Claude Code는 사용자의 자연어 요청을 받아 AI가 어떤 도구를 써야 하는지 판단하고, 권한 확인을 거쳐 안전하게 실행한 후, 결과를 다시 AI에게 돌려주는 **루프**를 핵심으로 한다.
2. 이 루프를 감싸는 시스템들(인증, 설정, 상태 관리, MCP, 플러그인, 브리지, 코디네이터)이 다양한 환경과 사용 사례를 지원한다.
3. 모든 설계 결정은 **안전성**(위험한 작업 차단), **성능**(스트리밍, 병렬 실행, 캐싱), **확장성**(도구, 스킬, 플러그인, MCP)의 세 가지 원칙을 따른다.

---

## 목차

1. [Claude Code란 무엇인가](#1-claude-code란-무엇인가)
2. [전체 구조를 한눈에 보기](#2-전체-구조를-한눈에-보기)
3. [실행 모드](#3-실행-모드)
4. [시작과 초기화 과정](#4-시작과-초기화-과정)
5. [쿼리 루프 — 핵심 엔진](#5-쿼리-루프--핵심-엔진)
6. [QueryEngine — SDK용 래퍼](#6-queryengine--sdk용-래퍼)
7. [도구(Tool) 시스템](#7-도구tool-시스템)
8. [도구 실행 오케스트레이션](#8-도구-실행-오케스트레이션)
9. [명령어(Command) 시스템](#9-명령어command-시스템)
10. [태스크(Task) 시스템](#10-태스크task-시스템)
11. [상태 관리](#11-상태-관리)
12. [서비스 레이어](#12-서비스-레이어)
13. [권한(Permission) 시스템](#13-권한permission-시스템)
14. [훅(Hook) 시스템](#14-훅hook-시스템)
15. [스킬(Skill)과 플러그인(Plugin) 시스템](#15-스킬skill과-플러그인plugin-시스템)
16. [UI 레이어](#16-ui-레이어)
17. [브리지(Bridge) 시스템](#17-브리지bridge-시스템)
18. [원격(Remote) 세션 관리](#18-원격remote-세션-관리)
19. [코디네이터(Coordinator) 모드](#19-코디네이터coordinator-모드)
20. [메모리(Memory) 시스템](#20-메모리memory-시스템)
21. [타입 시스템과 상수](#21-타입-시스템과-상수)
22. [유틸리티 모듈](#22-유틸리티-모듈)
23. [핵심 설계 패턴](#23-핵심-설계-패턴)
24. [전체 데이터 흐름 요약](#24-전체-데이터-흐름-요약)

---

## 1. Claude Code란 무엇인가

Claude Code는 Anthropic이 만든 공식 **CLI(터미널 명령줄) 도구**다. 사용자가 터미널에서 Claude AI와 대화하면서 코드를 읽고, 수정하고, 실행할 수 있게 해준다. 단순한 챗봇이 아니라, 파일을 직접 편집하고, 셸 명령을 실행하고, 웹을 검색하고, 외부 서비스와 연동하는 **"AI 소프트웨어 엔지니어"**에 가깝다.

> **비유:** 일반적인 AI 챗봇이 "전화 상담원"이라면, Claude Code는 "현장에 직접 와서 일하는 엔지니어"다.  
> 상담원은 조언만 줄 수 있지만, 현장 엔지니어는 실제로 장비를 만지고 문제를 고칠 수 있다.

**기술 스택:**

| 항목 | 기술 |
|------|------|
| 언어 | TypeScript |
| 터미널 UI | Ink (React 기반 TUI 프레임워크) |
| 상태 관리 | Zustand |
| 빌드 시스템 | bun (tree-shaking 포함) |

---

## 2. 전체 구조를 한눈에 보기

Claude Code의 동작은 크게 **네 단계**로 요약할 수 있다.

```
  +---------------------+
  |   User types in     |
  |   the terminal      |
  +---------+-----------+
            |
            v
  +---------------------+     Phase 1: STARTUP
  |     main.tsx        |     - Auth (OAuth / API key / Bedrock / Vertex)
  |  (initialization)   |     - Model selection
  |                     |     - Load settings & feature gates
  +---------+-----------+     - Collect Git status + CLAUDE.md
            |
            v
  +---------------------+     Phase 2: QUERY LOOP
  |     query.ts        |     - Send messages to Claude API (streaming)
  |   (core engine)     |<-+  - Receive response token by token
  |                     |  |  - Detect tool_use blocks in response
  +---------+-----------+  |
            |              |
            v              |
  +---------------------+  |  Phase 3: TOOL EXECUTION
  |   Tool Pipeline     |  |  - Validate input (Zod schema)
  |  (45+ built-in      |  |  - Check permissions (rules + classifier)
  |   tools + MCP)      |  |  - Execute tool (Bash, Read, Edit, ...)
  +---------+-----------+  |  - Return result to API
            |              |
            +--------------+  (loop until no more tool_use)
            |
            v
  +---------------------+     Phase 4: DISPLAY
  |   Ink TUI (React)   |     - Render messages, diffs, progress
  |  terminal display   |     - Show tool results
  +---------------------+     - Await next user input
```

**핵심은 2단계와 3단계 사이의 루프다.** 사용자가 "이 버그를 고쳐줘"라고 한 번 입력하면, Claude Code는 내부적으로 수많은 API 호출과 도구 실행을 자동으로 반복한다.

---

## 3. 실행 모드

Claude Code는 하나의 프로그램이지만, 상황에 따라 **여러 모드**로 동작한다.

```
                    +------------------+
                    |   Claude Code    |
                    +--------+---------+
                             |
      +----------+-----------+-----------+----------+
      |          |           |           |          |
      v          v           v           v          v
 +---------+ +--------+ +----------+ +--------+ +--------+
 |  REPL   | |Headless| |Coordinator| |Bridge | |Kairos  |
 |  Mode   | | Mode   | |  Mode    | | Mode  | | Mode   |
 +---------+ +--------+ +----------+ +--------+ +--------+
 Interactive  No UI,     Leader +     Local CLI  Always-on
 terminal UI  SDK/pipe   Workers      <-> Cloud  assistant
```

| 모드 | 설명 |
|------|------|
| **REPL 모드** | 가장 일반적인 대화형 모드. React 기반 UI가 터미널에 렌더링됨 |
| **헤드리스 모드** | UI 없이 SDK/파이프라인에서 프로그래밍 방식으로 실행. `QueryEngine` 클래스가 핵심 |
| **코디네이터 모드** | "리더" 에이전트가 여러 "워커" 에이전트를 동시에 관리하는 멀티에이전트 모드 |
| **브리지 모드** | 로컬 터미널을 클라우드의 claude.ai 웹 인터페이스와 연결 |
| **어시스턴트 모드(Kairos)** | 상시 대기하는 프로액티브 어시스턴트 모드 |
| **데몬 모드** | 백그라운드에서 실행되는 모드 |
| **뷰어 모드** | 원격 세션을 읽기 전용으로 관찰하는 모드 |

> **어떤 모드를 사용하든 내부의 핵심 엔진은 동일하다.** 차이점은 "사용자 입력을 어디서 받느냐"와 "결과를 어디에 보여주느냐"에 있다.

---

## 4. 시작과 초기화 과정

### 4.1 main.tsx — 모든 것의 출발점

`main.tsx`는 약 **800KB**에 달하는 거대한 단일 파일이다. 여러 파일로 나누지 않은 이유는 **시작 성능** 때문이다. 하나의 파일로 합치면 한 번의 디스크 읽기로 끝나 시작 시간을 줄일 수 있다.

**시작 과정 6단계:**

```
  main.tsx startup sequence
  =========================

  [1] Parallel I/O prefetch            (saves ~65ms)
      |-- MDM subprocess read
      |-- macOS Keychain prefetch
      |                                   These run WHILE
      v                                   heavy imports load (~135ms)
  [2] Conditional module loading
      |-- feature('COORDINATOR_MODE') --> load or skip
      |-- feature('KAIROS')           --> load or skip
      |                                   Dead code eliminated at build time
      v
  [3] Early settings load
      |-- Parse --settings CLI flag
      |-- --bare flag? --> skip CLAUDE.md, skills, hooks
      |
      v
  [4] Authentication
      |-- Try OAuth token              (claude.ai subscribers)
      |-- Try API key                  (ANTHROPIC_API_KEY)
      |-- Try AWS Bedrock              (sts:AssumeRole)
      |-- Try Google Vertex AI         (GoogleAuth)
      |-- Try Azure Foundry            (DefaultAzureCredential)
      |
      v
  [5] Model resolution
      |-- User-specified model?  --> use it
      |-- Subscription tier?     --> Max/Team Premium = Opus
      |                              Others = Sonnet
      v
  [6] Build initial state --> Launch REPL or Headless mode
```

### 4.2 컨텍스트 수집

모든 대화에는 두 가지 컨텍스트가 주입된다.

```
  Context injection (memoized for session lifetime)
  ==================================================

  System Context                    User Context
  +--------------------------+      +--------------------------+
  | Git branch: main         |      | CLAUDE.md files          |
  | Default branch: main     |      | (project instructions)   |
  | Git status (max 2000ch)  |      |                          |
  | Recent commits           |      | Today's date             |
  | Git user name            |      |                          |
  +--------------------------+      +--------------------------+
          |                                  |
          +----------------+-----------------+
                           |
                           v
                  Injected into every
                  API conversation turn
```

---

## 5. 쿼리 루프 — 핵심 엔진

### 5.1 기본 구조

`query.ts`(약 68KB)는 Claude Code의 **심장**이다. **비동기 제너레이터** 패턴을 사용하여 API 응답이 글자 단위로 도착하는 즉시 화면에 표시할 수 있다. 사용자는 AI가 "타이핑하는 것"을 실시간으로 볼 수 있다.

### 5.2 턴(Turn)의 처리 흐름

```
  Query Loop: one turn
  =====================

  +--[1. Message Preprocessing]-------------------------------+
  |  Snip Compact -----> remove old messages entirely         |
  |  Microcompact -----> shrink tool_use blocks inline        |
  |  Context Collapse -> stage collapse operations            |
  |  Auto-Compact -----> summarize if near token limit        |
  |                      (threshold = context_window - 13000) |
  +----------------------------+------------------------------+
                               |
                               v
  +--[2. API Streaming Call]----------------------------------+
  |  Send: messages + system prompt + tools schema            |
  |  Receive: streaming response (token by token)             |
  |  If model overloaded --> switch to fallback model          |
  +----------------------------+------------------------------+
                               |
                               v
  +--[3. Error Withholding & Recovery]-----------------------+
  |  413 Prompt Too Long:                                     |
  |    try collapse drain --> try reactive compact --> fail    |
  |  Max Output Tokens:                                       |
  |    escalate 8K->64K --> retry up to 3 times --> fail      |
  +----------------------------+------------------------------+
                               |
                               v
  +--[4. Tool Execution]--------------------------------------+
  |  Safe tools (Read, Grep, Glob):                           |
  |    --> run up to 10 in parallel                           |
  |  Unsafe tools (Edit, Bash, Write):                        |
  |    --> run one at a time, sequentially                    |
  |  Large results --> persist to disk, pass reference        |
  +----------------------------+------------------------------+
                               |
                               v
  +--[5. Post-processing]-------------------------------------+
  |  Run Stop Hooks (validation)                              |
  |  Check token budget                                       |
  |  Check max turns limit                                    |
  |  tool_use in response?                                    |
  |    YES --> build new State, go back to step 1             |
  |    NO  --> exit loop, return to user                      |
  +-----------------------------------------------------------+
```

### 5.3 구체적 예시

사용자가 "auth.ts의 버그를 고쳐줘"라고 입력하면 내부에서 이런 일이 벌어진다:

```
  Turn 1:  AI: "Let me read the file first."
           --> tool_use: FileRead("auth.ts")
           --> result: [file contents returned]

  Turn 2:  AI: "I see a null check missing on line 42. Let me fix it."
           --> tool_use: FileEdit("auth.ts", old="user.name", new="user?.name")
           --> result: "Edit applied successfully"

  Turn 3:  AI: "Let me verify the fix by running tests."
           --> tool_use: Bash("npm test -- auth.test.ts")
           --> result: "All 12 tests passed"

  Turn 4:  AI: "Done! Fixed the null check on line 42."
           --> no tool_use --> loop exits, response shown to user
```

사용자는 처음에 **한 번** 입력하고 결과만 기다린다. 내부에서는 4번의 턴, 3번의 도구 실행, 4번의 API 호출이 발생했다.

---

## 6. QueryEngine — SDK용 래퍼

`QueryEngine`은 `query.ts`의 쿼리 루프를 외부 프로그램이 쉽게 사용할 수 있게 감싼 클래스다.

```
  External Program (Agent SDK, etc.)
        |
        v
  +--[QueryEngine]----------------------------------+
  |  submitMessage("Fix the bug in auth.ts")         |
  |      |                                           |
  |      +--> Save transcript to disk (crash-safe)   |
  |      |                                           |
  |      +--> query() generator loop                 |
  |      |      |                                    |
  |      |      +--> yield SDKMessage (streaming)    |
  |      |      +--> yield SDKMessage ...            |
  |      |                                           |
  |      +--> Accumulate usage (tokens, cost)        |
  |      +--> Check budget (maxBudgetUsd)            |
  |      +--> yield SDKResult (final)                |
  |                                                  |
  |  State persisted across turns:                   |
  |    - mutableMessages[]                           |
  |    - totalUsage                                  |
  |    - permissionDenials[]                         |
  +--------------------------------------------------+
```

**핵심:** 사용자 메시지를 받으면 먼저 대화 기록을 디스크에 저장한다. API 호출 중 프로세스가 강제 종료되어도 사용자 메시지까지는 복구할 수 있다.

---

## 7. 도구(Tool) 시스템

### 7.1 도구란 무엇인가

"도구"는 Claude가 외부 세계와 상호작용하기 위한 수단이다. Claude AI는 그 자체로는 텍스트만 생성할 수 있다. Claude Code가 "다리" 역할을 하여 AI의 도구 사용 요청을 실제로 실행하고 결과를 돌려준다.

**45개 이상의 내장 도구** + **MCP를 통한 외부 도구** 지원

### 7.2 도구의 공통 구조

```
  Every Tool has:
  +-----------------------------------------------------------------+
  |  name          "BashTool", "FileEditTool", ...                  |
  |  inputSchema   Zod schema defining required/optional inputs     |
  |  call()        The actual execution function                    |
  |  description() Text shown to AI so it knows when to use it     |
  |                                                                 |
  |  checkPermissions()   Can this run in current context?          |
  |  validateInput()      Is the input semantically valid?          |
  |  isConcurrencySafe()  Safe to run alongside other tools?        |
  |  isReadOnly()         Does it modify anything?                  |
  |  maxResultSizeChars   Over this limit -> persist to disk        |
  |  render*()            React components for terminal UI          |
  +-----------------------------------------------------------------+
```

### 7.3 도구 등록과 조립

```
  Tool Assembly Pipeline
  ======================

  getAllBaseTools()                     44+ tools registered
        |
        v
  Feature gate filter                  Remove disabled features
        |
        v
  Deny rules filter                    Remove user-blocked tools
        |
        v
  Mode filter                          SIMPLE mode: only Bash, Read, Edit
        |
        v
  Built-in tools (sorted by name)
        |
        +------> assembleToolPool() <------+
                        |                   |
                        v              MCP tools
                 Merged tool list      (sorted by name)
```

> **순서가 중요한 이유:** API 프롬프트 캐싱 안정성 때문이다. 도구 순서가 바뀌면 캐시가 무효화되어 비용이 증가한다.

### 7.4 주요 도구 카테고리

```
  Tool Categories
  ===============

  File Operations     Shell          Search          Web
  +-------------+  +---------+   +-----------+   +----------+
  | FileRead    |  | Bash    |   | Grep      |   | WebFetch |
  | FileEdit    |  |         |   | Glob      |   | WebSearch|
  | FileWrite   |  |         |   | ToolSearch|   |          |
  | NotebookEdit|  |         |   |           |   |          |
  +-------------+  +---------+   +-----------+   +----------+

  Agent/Team          Planning        Tasks           Skill
  +-------------+  +-----------+   +----------+   +----------+
  | Agent       |  | EnterPlan |   | TaskCreate|  | Skill    |
  | SendMessage |  | ExitPlan  |   | TaskGet   |  |          |
  | TeamCreate  |  |           |   | TaskUpdate|  |          |
  | TeamDelete  |  |           |   | TaskList  |  |          |
  +-------------+  +-----------+   +----------+   +----------+
```

**주요 도구 설명:**

- **BashTool:** 셸 명령 실행. 가장 강력하지만 가장 위험. Tree-sitter로 명령어 AST를 분석하여 "기본 거부(fail-closed)" 설계 적용. 15초 초과 시 백그라운드 태스크로 전환.
- **AgentTool:** 다른 AI를 고용하는 도구. 서브에이전트를 만들어 부분 작업을 위임. 5가지 실행 방식 지원.
- **FileEditTool:** 파일의 특정 문자열 교체. 퍼지 매칭, 인코딩 보존, Git diff 생성.
- **GrepTool:** ripgrep 기반 텍스트 검색. 3가지 출력 모드, 기본 250개 결과 제한.

---

## 8. 도구 실행 오케스트레이션

### 8.1 실행 파이프라인 10단계

```
  Tool Execution Pipeline (for each tool_use block)
  ==================================================

  [1] Lookup tool by name ---> not found? try aliases
  [2] Check abort signal ---> user pressed Ctrl+C? exit
  [3] Validate input (Zod) -> bad format? friendly error
  [4] Run PreToolUse hooks -> hook says block? stop here
  [5] Check permissions -----> deny? ask user? auto-classify?
  [6] Execute tool.call() ---> the actual work happens here
  [7] Map result to API format
  [8] Persist if oversized --> save to disk, return reference
  [9] Run PostToolUse hooks
  [10] Log telemetry event
```

### 8.2 동시성 모델

```
  Tool Concurrency: Partitioning Algorithm
  =========================================

  Input:  [Read] [Grep] [Glob] [Edit] [Read] [Read] [Bash]
           safe   safe   safe  UNSAFE  safe   safe  UNSAFE

  Batch 1: [Read, Grep, Glob]  --> parallel (up to 10)
  Batch 2: [Edit]              --> serial (alone)
  Batch 3: [Read, Read]        --> parallel
  Batch 4: [Bash]              --> serial (alone)
```

> **원칙:** 안전한 것은 빠르게 병렬로, 위험한 것은 천천히 하나씩.

### 8.3 스트리밍 도구 실행기

API 응답이 아직 스트리밍 중일 때부터 이미 도착한 도구 사용 블록의 실행을 시작하는 최적화:

```
  API stream:   [...text...][tool_use A][...text...][tool_use B][done]
                                |                        |
  Execution:              start A                   start B
                          |..running..|done     |..running..|done
```

---

## 9. 명령어(Command) 시스템

명령어는 사용자가 `/`로 시작하는 입력을 통해 호출하는 기능이다. **80개 이상의 명령어** 지원.

```
  Command Types
  =============

  /commit, /review ...       /settings, /doctor ...    /help ...
  +-------------------+      +-------------------+     +-----------+
  | Prompt Command    |      | Local Command     |     | Slash Cmd |
  | Expands to a      |      | Renders JSX UI    |     | Can be    |
  | system prompt for |      | in the terminal   |     | either    |
  | the AI to follow  |      |                   |     | type      |
  +-------------------+      +-------------------+     +-----------+

  Additional sources:
    +-- Plugin commands   (from ~/.claude/plugins/)
    +-- Skill commands    (from ~/.claude/skills/)
    +-- MCP commands      (from connected MCP servers)
```

| 유형 | 설명 | 예시 |
|------|------|------|
| 프롬프트 명령어 | AI에게 전달할 프롬프트로 확장 | `/commit` → 커밋 메시지 작성 프롬프트 |
| 로컬 명령어 | React 컴포넌트를 렌더링하는 UI 기반 | `/settings`, `/doctor` |

---

## 10. 태스크(Task) 시스템

태스크는 백그라운드에서 실행되는 **비동기 작업**을 관리하는 시스템이다.

```
  Task Lifecycle
  ==============

  Spawn                  Register               Run in background
  (BashTool async,  -->  AppState.tasks[id]  --> output -> disk file
   AgentTool, etc.)      status: "running"       progress reported
                                                       |
                                                       v
                         AI reads output          Completion
                         via TaskOutputTool  <--  status: "completed"
                                                  or "failed" / "killed"

  Task Types:
    b________ = local_bash          (shell command)
    a________ = local_agent         (in-process sub-agent)
    r________ = remote_agent        (cloud execution)
    t________ = in_process_teammate (team member)
    w________ = local_workflow      (workflow script)
    m________ = monitor_mcp         (MCP server watch)
    d________ = dream               (async continuation)
```

각 태스크는 고유 ID(유형 접두사 + 8자리 랜덤 문자)를 가지며, 상태는 `pending`, `running`, `completed`, `failed`, `killed` 중 하나다.

---

## 11. 상태 관리

### 11.1 AppState — 글로벌 상태

Claude Code의 모든 글로벌 상태는 `AppState`라는 하나의 큰 타입으로 정의된다. **불변(Immutable)** 제약이 적용되어 상태를 직접 수정할 수 없고 항상 새로운 객체를 만들어야 한다.

```
  AppState (DeepImmutable)
  ========================

  +-- Settings & Config ----+  +-- UI State -----------+
  |  settings               |  |  expandedView         |
  |  mainLoopModel          |  |  statusLineText       |
  |  toolPermissionContext   |  |  spinnerTip           |
  +-------------------------+  +------------------------+

  +-- Agent / Team ---------+  +-- Tasks ---------------+
  |  agentNameRegistry      |  |  tasks (mutable!)      |
  |  teamContext            |  |  foregroundedTaskId     |
  +-------------------------+  +------------------------+

  +-- MCP -----------------+   +-- Plugins -------------+
  |  clients[]             |   |  enabled[]             |
  |  tools[]               |   |  disabled[]            |
  |  commands[]            |   |  errors[]              |
  +------------------------+   +------------------------+

  +-- Bridge / Remote -----+   +-- Feature Flags -------+
  |  replBridgeConnected   |   |  kairosEnabled         |
  |  remoteSessionUrl      |   |  fastMode              |
  +------------------------+   +------------------------+
```

### 11.2 상태 변경의 부수효과

| 변경 | 부수효과 |
|------|----------|
| 권한 모드 변경 | CCR과 SDK 리스너에게 알림 |
| 모델 변경 | 설정 파일에 영속화 |
| 설정 변경 | 인증 캐시 무효화 |

---

## 12. 서비스 레이어

### 12.1 API 클라이언트와 재시도

API 클라이언트(약 3,000줄)의 주요 역할:
- **베타 기능 조립:** 모델 능력에 따라 `thinking`, `tool_search` 등 동적 활성화
- **프롬프트 캐싱:** 시스템 프롬프트와 도구 스키마를 1시간 캐시하여 비용 절감
- **도구 스키마 정규화:** 내부 Tool 객체를 API용 JSON으로 변환

**에러 유형별 재시도 전략:**

```
  API Retry Strategy
  ==================

  Error        Action
  -----        ------
  429          retry-after < 500ms? wait & retry (preserve cache)
  (rate limit) otherwise: disable fast mode, switch to standard model

  529          3 consecutive? switch to fallback model
  (overloaded) non-foreground tasks: give up immediately

  401          force-refresh OAuth token, recreate client
  (auth fail)

  ECONNRESET   disable keep-alive, recreate client
  EPIPE

  Persistent   retry forever with exponential backoff
  mode (ANT)   up to 6 hours total (unattended sessions only)
```

### 12.2 자동 압축 서비스

대화가 길어져 컨텍스트 윈도우에 도달하면 자동으로 작동한다. 임계값은 `유효 윈도우 - 13,000 토큰`.

```
  Auto-Compact Flow
  =================

  Token usage > threshold?
        |
        v
  Circuit breaker check (3 consecutive failures = stop trying)
        |
        v
  Try session memory compact first (preserves granularity)
        |
        | failed?
        v
  Full conversation compact:
    1. Strip images (save tokens)
    2. Group messages by API round
    3. Generate summary via forked sub-agent
    4. Replace old messages with summary
    5. Restore top 5 referenced files (50K token budget)
    6. Re-inject skills (25K budget, 5K per skill)
```

### 12.3 MCP 프로토콜 서비스

MCP(Model Context Protocol)는 외부 도구와 리소스를 Claude Code에 통합하는 표준 프로토콜이다.

```
  MCP Server Connection States
  =============================

  Connected ----> Failed -----> NeedsAuth
      ^             |               |
      |             v               v
      +------- Pending <-----------+
                (retry: 1s -> 30s exponential backoff, max 5 attempts)

  Transport Types:
    Stdio ------> spawn local process
    SSE/HTTP ---> connect to remote server
    WebSocket --> bidirectional communication
    SDK --------> built-in server
    Claude.ai --> proxy relay
```

---

## 13. 권한(Permission) 시스템

### 13.1 왜 권한 시스템이 필요한가

Claude Code는 사용자 컴퓨터에서 파일을 수정하고 명령을 실행할 수 있다. 권한 시스템은 "어떤 도구를, 어떤 입력으로, 실행해도 되는가"를 판단하는 **게이트키퍼** 역할을 한다.

### 13.2 권한 모드와 확인 파이프라인

```
  Permission Pipeline
  ===================

  Tool use request arrives
        |
  [1]   v
  validateInput()            Is the input semantically valid?
        |
  [2]   v
  checkPermissions()         Tool-specific rules
        |
  [3]   v
  Run PreToolUse hooks       User-defined hooks can block
        |
  [4]   v
  Match against rules        +-- alwaysAllow rules --> APPROVE
        |                    +-- alwaysDeny rules  --> DENY
        |                    +-- alwaysAsk rules   --> ASK USER
        |
  [5]   v  (no rule matched)
  Which permission mode?
        |
        +-- Default mode --> ASK USER (show prompt)
        |
        +-- Auto mode ----> AI Classifier (2-stage)
        |                     Stage 1: Fast (streaming)
        |                     Stage 2: Thinking (deep analysis)
        |
        +-- Plan mode ----> read-only tools only
        |
        +-- Bypass mode --> APPROVE everything

  Rule sources (highest to lowest priority):
    Local settings > Project settings > User settings > Flags > Policy
```

| 모드 | 설명 |
|------|------|
| **Default** | 읽기 전용 자동 승인, 위험한 작업은 사용자 확인 |
| **Auto** | AI 분류기 2단계(빠른 판단 + 심층 분석)로 위험도 평가 |
| **Plan** | 읽기 전용 도구만 허용하는 "계획 수립 전용" 모드 |
| **Bypass** | 모든 것 자동 승인 (개발 환경 전용) |

---

## 14. 훅(Hook) 시스템

훅은 특정 이벤트가 발생했을 때 자동으로 실행되는 **사용자 정의 동작**이다.

```
  Hook Event Timeline
  ====================

  SessionStart                                        Stop
      |                                                |
      v                                                v
  [session begins]                               [AI response done]
      |
      |   UserPromptSubmit
      |       |
      v       v
      |   [user types message]
      |       |
      |       |   PreToolUse    PostToolUse
      |       |       |              |
      v       v       v              v
  ----+-------+-------+--------------+-----------------+----> time
              |       |              |
              |   [tool executes]    |
              |                      |
              |   PostToolUseFailure (if tool failed)
              |
          PermissionRequest (when permission needed)

  Hook Response Controls:
    continue: false  --> stop current operation
    decision: block  --> deny the tool execution
    updatedInput     --> modify tool input before execution
    additionalContext --> inject extra context
```

| 훅 | 시점 | 역할 |
|---|---|---|
| `PreToolUse` | 도구 실행 직전 | 승인/차단/입력 수정 가능 |
| `PostToolUse` | 실행 직후 | 결과 검증 |
| `UserPromptSubmit` | 사용자 입력 시 | 추가 컨텍스트 주입 |
| `Stop` | 응답 완료 후 | 검증 수행 |

---

## 15. 스킬(Skill)과 플러그인(Plugin) 시스템

### 15.1 도구 vs 스킬 vs 플러그인 vs 명령어 비교

```
  Tools vs Skills vs Plugins vs Commands
  ========================================

  Tool       Low-level, atomic action        "Read this file"
             Used by AI automatically         "Run this command"

  Skill      High-level, reusable template   "Review this code"
             Invoked by user as /command      "Create a commit"

  Plugin     Package of skills + hooks +     "GitHub integration"
             MCP servers bundled together     "Slack integration"

  Command    User-facing / shortcut          /help, /settings, /model
             Can be prompt-type or UI-type
```

### 15.2 스킬

스킬은 재사용 가능한 작업 템플릿이다. 사용자가 `/skill-name`으로 호출하면, 미리 정의된 프롬프트가 AI에게 전달된다.

```
  Skill System
  ============

  Disk-based skills                     Bundled skills
  ~/.claude/skills/                     registerBundledSkill()
  .claude/skills/                             |
       |                                      v
  +----------+    YAML frontmatter:    +----------+
  | commit.md|    name, description,   | simplify |
  | review.md|    whenToUse, tools,    | commit   |
  | ...      |    model, paths         | ...      |
  +----------+                         +----------+
```

### 15.3 플러그인

플러그인은 스킬, 훅, MCP 서버를 하나의 패키지로 묶은 것이다.

```
  Plugin = Skills + Hooks + MCP Servers
  =========================================================

  BuiltinPlugin
  +--------------------------------------------+
  |  name: "github-integration"                |
  |  skills:     [pr-review, autofix-pr, ...]  |
  |  hooks:      { PreToolUse: [...] }         |
  |  mcpServers: { github: { command: ... } }  |
  |  isAvailable()  --> conditional availability|
  |  defaultEnabled --> on/off by default       |
  +--------------------------------------------+
```

---

## 16. UI 레이어

### 16.1 자체 제작 TUI 프레임워크 (Ink)

Claude Code의 터미널 UI는 React 기반의 자체 제작 TUI 프레임워크를 사용한다. 웹 브라우저 대신 터미널 문자 그리드에 렌더링한다는 차이만 있을 뿐, 개발 방식은 웹 React와 동일하다.

**렌더링 파이프라인:**

```
  Ink TUI Rendering Pipeline
  ===========================

  React component update
        |
        v
  Reconciler calculates diff  (custom react-reconciler)
        |
        v
  Yoga layout engine           (Flexbox for terminal)
        |
        v
  Render to screen buffer      Double buffering:
  +------------------+         +------------------+
  | back frame (new) |  diff   | front frame (old)|
  |                  | ------> |                  |
  +------------------+  only   +------------------+
                        changed
                        cells
        |
        v
  Write ANSI to terminal       Throttled at FRAME_INTERVAL_MS
```

**4가지 핵심 최적화:**

| 기법 | 설명 |
|------|------|
| **이중 버퍼링** | 변경된 셀만 터미널에 출력, 깜빡임 없음 |
| **객체 풀링** | 같은 문자열/스타일을 메모리에 하나만 저장 (`CharPool`, `StylePool`, `HyperlinkPool`) |
| **더티 추적** | 변경된 부분만 다시 그림 |
| **프레임 조절** | 업데이트 빈도 제한으로 터미널 부하 방지 |

### 16.2 화면 구성

```
  REPL Screen Layout
  ===================

  +---------------------------------------------------+
  |  Logo Header (memoized, rarely re-renders)         |
  +---------------------------------------------------+
  |  Message List (virtualized)                         |
  |  +-----------------------------------------------+ |
  |  | User: Fix the bug in auth.ts                   | |
  |  |                                                | |
  |  | Assistant: I'll look at the file...            | |
  |  |   [Read] auth.ts                               | |
  |  |   [Edit] auth.ts (line 42)                     | |
  |  |   Done! Fixed the null check.                  | |
  |  +-----------------------------------------------+ |
  +---------------------------------------------------+
  |  Task/Teammate Panel (toggle with Ctrl+T)          |
  +---------------------------------------------------+
  |  Prompt Input                                       |
  |  > mode: prompt | bash                              |
  |  > [type here...]           [autocomplete dropdown] |
  |  > status bar: model, tokens, cost                  |
  +---------------------------------------------------+
```

### 16.3 키바인딩 시스템

| 컨텍스트 | 키 | 동작 |
|------|---|------|
| **Global** | `Ctrl+C` | 인터럽트 |
| **Global** | `Ctrl+D` | 종료 |
| **Global** | `Ctrl+T` | 태스크 패널 토글 |
| **Chat** | `Enter` | 제출 |
| **Chat** | `Up/Down` | 히스토리 |
| **Autocomplete** | `Tab` | 수락 |
| **Autocomplete** | `Esc` | 닫기 |

커스터마이즈: `~/.claude/keybindings.json`

---

## 17. 브리지(Bridge) 시스템

브리지는 로컬 터미널의 Claude Code를 클라우드의 CCR(Claude Remote Runtime)에 연결하는 시스템이다. **33개의 소스 파일**로 구성된 복잡한 서브시스템.

```
  Bridge Architecture
  ====================

  claude.ai (web)               Local Machine
  +----------------+            +---------------------------+
  |  User types    |            |  Bridge (bridgeMain.ts)   |
  |  in browser    |            |                           |
  |       |        |            |  [1] Register environment |
  |       v        |   poll     |  [2] Poll for work -------|---+
  |  CCR Backend   |<-----------|  [3] Spawn session -------|   |
  |  stores work   |            |  [4] ACK work             |   |
  |       |        |  results   |  [5] Heartbeat loop       |   |
  |       |        |----------->|  [6] Archive on done      |   |
  +-------+--------+            +---------------------------+   |
          |                              |                      |
          v                              v                      |
  +----------------+            +------------------+            |
  |  Web UI shows  |            |  Child process   |<-----------+
  |  results       |            |  (Claude Code)   |
  +----------------+            |  executes locally|
                                +------------------+

  Multi-session: up to 32 parallel sessions
  Dedup: BoundedUUIDSet (circular buffer, fixed memory)
```

**토큰 갱신 전략:**

| 버전 | 방식 |
|------|------|
| CCR v1 | OAuth 토큰, 직접 갱신 |
| CCR v2 | 세션 JWT (~5h55m), 만료 5분 전 사전 스케줄링 |

**백오프 전략:**

| 에러 유형 | 백오프 |
|------|------|
| 연결 에러 | 2s → 120s (최대), 10분 후 포기 |
| 일반 에러 | 500ms → 30s (최대) |
| 종료 | SIGTERM → 30초 후 SIGKILL |

---

## 18. 원격(Remote) 세션 관리

원격 세션 관리자는 단일 CCR 세션에 WebSocket으로 연결하여 메시지를 스트리밍한다.

```
  WebSocket: wss://api.anthropic.com/v1/sessions/ws/{sessionId}/subscribe

  State Machine:

  closed ---(connect)---> connecting ---(onopen)---> connected
    ^                                                    |
    |                                                    |
    +---------(close/error, max 5 retries)---------------+

  Reconnection:
    - General disconnect: max 5 attempts, 2s delay
    - Session not found (4001): 3 retries (transient during compaction)
    - Auth failure (4003): no retry
    - Ping/Pong every 30s to detect stale connections
```

> **역할 비유:** 브리지는 "공항 컨트롤 타워", 원격 세션 관리자는 "조종석의 통신 장비"

---

## 19. 코디네이터(Coordinator) 모드

하나의 "리더" 에이전트가 여러 "워커" 에이전트를 관리하는 **멀티에이전트 오케스트레이션** 시스템이다.

```
  Coordinator Architecture
  =========================

                +-------------------+
                |  LEADER (main)    |
                |  - AgentTool      |  Does NOT edit code directly.
                |  - SendMessage    |  Delegates everything.
                |  - TaskStop       |
                +--------+----------+
                         |
          +--------------+--------------+
          |              |              |
          v              v              v
   +------------+ +------------+ +------------+
   | WORKER 1   | | WORKER 2   | | WORKER 3   |
   | QueryEngine| | QueryEngine| | QueryEngine|
   |            | |            | |            |
   | Read, Grep | | Edit, Bash | | Read, Test |
   +------------+ +------------+ +------------+
    (isolated)    (isolated)     (isolated)
```

**작업 단계:**

| 단계 | 방식 | 설명 |
|------|------|------|
| **Research** | 병렬 | 여러 워커가 다른 파일/각도를 동시에 탐색 |
| **Synthesis** | 순차 | 리더가 모든 결과를 직접 이해 (위임 금지) |
| **Implement** | 영역별 | 워커가 코드 수정, 한 번에 한 영역 |
| **Verify** | 병렬 | 워커들이 독립적으로 테스트 실행 |

> **중요 규칙:** 종합 단계에서 리더는 반드시 워커의 결과를 직접 이해해야 한다. "워커가 알아서 했을 테니 넘어가자"는 위임은 금지된다.

---

## 20. 메모리(Memory) 시스템

대화가 끝나도 유지되는 **영속적인 정보 저장소**다.

```
  Memory System Structure
  ========================

  ~/.claude/projects/{project-slug}/memory/
  |
  +-- MEMORY.md              (index file, max 200 lines / 25KB)
  |   |
  |   +-- "- [User role](user_role.md) -- senior Go dev, new to React"
  |   +-- "- [Testing](feedback_testing.md) -- use real DB, not mocks"
  |   +-- "- [Merge freeze](project_freeze.md) -- until 2026-03-05"
  |
  +-- user_role.md
  +-- feedback_testing.md
  +-- project_freeze.md
  +-- reference_linear.md
```

**메모리 유형:**

| 유형 | 내용 | 예시 |
|------|------|------|
| `user` | 사용자 역할, 전문성, 선호도 | "Deep Go expertise, new to React" |
| `feedback` | 작업 방식, 교정, 확인 사항 | "Use real DB in tests, not mocks" |
| `project` | 목표, 마감, 결정 사항 | "Merge freeze until 2026-03-05" |
| `reference` | 외부 시스템 포인터 | "Pipeline bugs tracked in Linear" |

> **저장하지 않는 것:** 코드 패턴, 아키텍처, git 히스토리, CLAUDE.md에 이미 있는 것

---

## 21. 타입 시스템과 상수

### 21.1 핵심 타입 정의

- **메시지 타입:** 사용자/어시스턴트/시스템/진행/첨부/도구결과
- **권한 타입(62KB):** 모드, 규칙 소스, 결정(허용/거부/질문) 세밀하게 타입화
- **ID 타입:** `SessionId`, `AgentId`를 브랜딩 타입으로 정의하여 혼용 방지

### 21.2 설정 소스 우선순위

```
  Settings Priority (highest to lowest)
  ======================================

  [1] Local     .claude/settings.local.json    (editable)
  [2] Project   .claude/settings.json          (editable)
  [3] User      ~/.claude/settings.json        (editable)
  [4] Flags     flag file                      (read-only)
  [5] Policy    enterprise policy              (read-only)
```

---

## 22. 유틸리티 모듈

| 모듈 | 크기 | 역할 |
|------|------|------|
| **Bash 보안** | 888KB, 18파일 | Tree-sitter 파서로 셸 명령어 AST 분석, 기본 거부 설계 |
| **샌드박스** | - | 도구 실행 격리 환경 |
| **토큰 계산** | - | `tokenCountWithEstimation()` — 정확한 토큰 수 + 추정치 합산 |
| **스웜/팀 관리** | - | `TeamFile`로 에이전트 간 협업 관리 |
| **글로벌 세션 상태** | 56KB | 세션 ID, 누적 비용, 모델별 사용량, 훅, 에이전트 색상 맵 |

**경로 표기법:**

| 표기 | 의미 |
|------|------|
| `//path` | 절대 루트 |
| `/path` | 설정 파일 기준 상대 |
| `~/path` | 홈 디렉토리 |

---

## 23. 핵심 설계 패턴

Claude Code 전반에서 반복적으로 나타나는 **8가지 설계 패턴:**

```
  Design Patterns Summary
  ========================

  [1] Generator Streaming     query() yields events one-by-one
                              --> real-time display of AI "thinking"

  [2] Feature Gate            bun:bundle dead-code elimination
      Dead Code Removal       --> disabled features removed at build time

  [3] Memoized Context        getSystemContext(), getUserContext()
                              --> computed once, cached for session

  [4] Withhold & Recover      Buffer recoverable errors (413, max tokens)
                              --> try auto-fix before showing to user

  [5] Lazy Import             Wrap in function to avoid circular deps
                              --> loaded only when actually called

  [6] Immutable State         DeepImmutable + Zustand
                              --> predictable state changes

  [7] Interruption            Save transcript BEFORE query loop
      Resilience              --> crash mid-API = resume from last message

  [8] Dependency Injection    query() receives deps parameter
                              --> mockable for tests, swappable per mode
```

| 패턴 | 목적 |
|------|------|
| Generator Streaming | 실시간 스트리밍 표시 |
| Feature Gate | 빌드 타임 데드 코드 제거 |
| Memoized Context | 세션 동안 컨텍스트 캐시 |
| Withhold & Recover | 복구 가능한 에러를 자동 처리 |
| Lazy Import | 순환 의존성 방지, 필요 시 로딩 |
| Immutable State | 예측 가능한 상태 변경 |
| Interruption Resilience | 크래시 복구 |
| Dependency Injection | 테스트 용이성, 모드별 교체 |

---

## 24. 전체 데이터 흐름 요약

```
  End-to-End Data Flow
  =====================

  User runs "claude" in terminal
        |
        v
  main.tsx
  +-- Auth (OAuth / API key / Bedrock / Vertex)
  +-- Model resolution (Opus for Max, Sonnet for others)
  +-- Load settings + feature gates
  +-- Collect context (Git status + CLAUDE.md)  [memoized]
  +-- Build tool pool (built-in + MCP)
  +-- Launch REPL  (or headless QueryEngine)
        |
        v
  User types: "Fix the bug in auth.ts"
        |
        v
  Normalize message for API
        |
        v
  query() generator loop  <-----------------------------------------+
  |                                                                  |
  +-- [Pre-process] snip / microcompact / auto-compact if needed     |
  +-- [API call] stream response from Claude API                     |
  +-- [Error?] withhold & recover (413 -> compact, max_tok -> retry) |
  +-- [Tool use?]                                                    |
  |     YES --> permission check --> execute tool --> collect result  |
  |             (pipeline: validate -> hooks -> rules -> classifier) -+
  |     NO  --> display final response
  |
  +-- Record transcript to disk
  +-- Track cost (per model: input/output/cache tokens)
  +-- Await next user input
```

---

*본 문서는 Claude Code의 소스 코드 구조를 분석한 것으로, 실제 소스 코드는 포함하지 않습니다.*
