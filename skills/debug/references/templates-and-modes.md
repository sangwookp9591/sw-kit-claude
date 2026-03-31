# Debug Templates & Secondary Modes

## DEBUG.md 템플릿

```markdown
# Debug: {title}
- Status: OPEN
- Created: {YYYY-MM-DD}
- Last Activity: {YYYY-MM-DD}

## 증상
{user-reported symptom}

## 관련 코드
- [ ] {file1} — {reason}
- [ ] {file2} — {reason}

## 가설
### H1: {hypothesis}
- **Claim**: {what you think is wrong}
- **Evidence FOR**: {observations supporting}
- **Evidence AGAINST**: {observations contradicting}
- **Test**: {how to verify}
- **결과**: (미실행)
- **판정**: -

## 결론
(미완료)

## 수정 사항
(없음)
```

---

## Mode B: 세션 재개 (인자 없음)

### Step 1: 미완료 세션 스캔

```bash
grep -rl "Status: OPEN\|Status: INVESTIGATING" .aing/debug/ 2>/dev/null | sort
```

결과가 없으면: "활성 디버그 세션이 없습니다. `/aing debug <증상>` 으로 새 세션을 시작하세요."

### Step 2: 세션 선택

세션이 1개이면 자동 선택. 2개 이상이면 목록 출력 후 선택 안내:

```
활성 디버그 세션:
  1. login-failure — 로그인 안됨 (INVESTIGATING)
  2. api-timeout  — API 응답 없음 (OPEN)

재개할 세션 번호를 입력하세요:
```

### Step 3: 마지막 상태에서 재개

선택된 `.aing/debug/{date}-{slug}.md` 를 읽고:
- 마지막 미테스트 가설부터 계속
- INCONCLUSIVE 가설은 재테스트 고려
- 새 가설 추가 필요시 H{N+1} 로 추가

---

## Mode C: 목록 조회 (`--list`)

```bash
ls .aing/debug/*.md 2>/dev/null
```

각 파일에서 Status, Created, title 추출 후 테이블 출력:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  aing debug sessions
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  OPEN
  2026-03-24  login-failure     로그인 안됨

  INVESTIGATING
  2026-03-23  api-timeout       API 응답 없음

  RESOLVED
  2026-03-22  null-pointer      NPE in UserService

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
