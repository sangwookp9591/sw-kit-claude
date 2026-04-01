# aing 릴리즈 가이드

## 버전 관리 규칙

**5곳**의 버전/description이 반드시 동기화되어야 합니다:

### 버전 (3곳 동일 필수)

| 파일 | 필드 | 예시 |
|------|------|------|
| `package.json` | `"version"` | `"2.8.9"` |
| `.claude-plugin/plugin.json` | `"version"` | `"2.8.9"` |
| `.claude-plugin/marketplace.json` | `"version"` (2곳: 루트 + plugins[0]) | `"2.8.9"` |

### Description (agent 수/skill 수 반영)

| 파일 | 필드 | 업데이트 항목 |
|------|------|------------|
| `package.json` | `"description"` | agent 수, skill 수, innovation 수 |
| `.claude-plugin/plugin.json` | `"description"` | 동일 |
| `.claude-plugin/marketplace.json` | `plugins[0].description` | 동일 |
| `README.md` | Agent Team 제목 + Why aing 테이블 | agent 수, spec 테이블 |

### CHANGELOG

| 파일 | 업데이트 |
|------|---------|
| `CHANGELOG.md` | 새 버전 엔트리 추가 |

## 릴리즈 절차

**"배포해"라고 하면 이 절차를 따른다.**

### 1. 코드 변경 완료

모든 변경사항이 main 브랜치에 머지된 상태여야 합니다.

### 2. 버전 범프 (3곳)

```bash
# 3곳 모두 업데이트 (예: 2.8.9 → 2.9.0)
# package.json            → "version": "X.Y.Z"
# .claude-plugin/plugin.json     → "version": "X.Y.Z"
# .claude-plugin/marketplace.json → "version": "X.Y.Z" (루트 + plugins[0] = 2곳)
```

검증:
```bash
grep '"version"' package.json .claude-plugin/plugin.json .claude-plugin/marketplace.json
# 모든 출력이 동일한 버전이어야 함
```

### 3. Description 업데이트 (4곳)

agent 추가/제거, skill 추가/제거, innovation 변경 시:
```
package.json              → "description"
.claude-plugin/plugin.json       → "description"
.claude-plugin/marketplace.json  → plugins[0].description
README.md                 → <h2 id="team">Agent Team (N named agents)</h2>
                          → "N agents, N skills, ..." (Why aing 섹션)
                          → Feature Spec 테이블의 Named Agents 행
                          → 새 agent면 Team 테이블에 행 추가
```

### 4. CHANGELOG 작성

`CHANGELOG.md` 상단에 새 버전 엔트리 추가:

```markdown
## [X.Y.Z] - YYYY-MM-DD — 제목

### Added / Fixed / Changed
- 변경 내용
```

### 5. 빌드 확인

```bash
npm run build:ts    # TypeScript 컴파일 → dist/ 생성
npm run test:unit   # 단위 테스트
```

`dist/` 디렉토리가 정상 생성되는지 확인. `package.json`의 `"files"` 필드에 `"dist/"`가 포함되어 있어서 publish 시 자동 포함됩니다.

### 6. 최종 검증 (커밋 전)

```bash
# 버전 동기화 확인
grep '"version"' package.json .claude-plugin/plugin.json .claude-plugin/marketplace.json

# agent 수 확인
ls agents/*.md | wc -l

# description agent 수 일치 확인
grep -h '"description"' package.json .claude-plugin/plugin.json
```

### 7. 커밋 & 푸시

```bash
git add -A
git commit -m "feat: 설명, bump to vX.Y.Z"   # 또는 fix:, chore:
git push origin main
```

### 8. 사용자 업데이트 확인

푸시 후 사용자들은 아래 명령으로 업데이트 가능:

```
claude plugin update aing@aing-marketplace
```

## 빌드 아키텍처

```
소스 (.ts)                    빌드 결과 (dist/)
─────────────────────────────────────────────────
hooks-handlers/*.ts    →    dist/hooks-handlers/*.js    (hooks.json에서 참조)
scripts/**/*.ts        →    dist/scripts/**/*.js        (SKILL.md에서 참조)
```

- `hooks.json`: `${CLAUDE_PLUGIN_ROOT}/dist/hooks-handlers/*.js` 참조
- `skills/*/SKILL.md`: `${CLAUDE_PLUGIN_ROOT}/dist/scripts/*.js` 참조
- `package.json` `"files"` 필드: `["agents/", "skills/", "hooks/", "dist/", "browse/dist/", ...]`

## 주의사항

- `.mjs` 확장자를 스킬에서 사용하지 말 것. `tsc`는 `module: "NodeNext"`에서 `.js`로 출력
- `prepublishOnly`가 `npm run build`를 실행하므로, npm publish 시 자동 빌드됨
- **`dist/`는 반드시 git에 커밋해야 함.** 플러그인 캐시(`~/.claude/plugins/cache/`)는 git clone 기반이므로, `dist/`가 git에 없으면 hooks와 scripts가 MODULE_NOT_FOUND 에러 발생
- `.gitignore`에서 `dist/`를 제외하지 말 것
- 릴리즈 전 `npm run build:ts`로 빌드 후 `dist/` 변경분도 함께 커밋

## 버전 히스토리 확인

```bash
# 현재 설치된 버전
cat ~/.claude/plugins/installed_plugins.json | grep -A2 '"aing@aing-marketplace"'

# 릴리즈 태그 (사용 시)
git tag -l 'v*'
```
