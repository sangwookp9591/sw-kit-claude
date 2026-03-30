# Contributing

## Setup

```bash
git clone https://github.com/sangwookp9591/ai-ng-kit-claude.git
cd ai-ng-kit-claude
```

No dependencies to install. Pure Node.js v18+.

## Testing

```bash
# Run all tests
node --test tests/*.test.mjs

# Run specific test
node --test tests/review-modules.test.mjs

# Check skill docs freshness
npm run build:check
```

All tests must pass before committing.

## Project Structure

```
agents/          15 agent markdown files
skills/          26 skill definitions
hooks-handlers/  7 hook event handlers
scripts/         88+ modules organized by domain
tests/           21 test files, 113+ tests
docs/            User guide, roadmap
```

## Commit Conventions

Use conventional commits:
- `feat:` — New feature
- `fix:` — Bug fix
- `refactor:` — Code restructuring
- `test:` — Test additions
- `docs:` — Documentation
- `chore:` — Maintenance

## Adding a New Agent

1. Create `agents/{name}.md` with frontmatter (name, description, model, tools)
2. Add entrance banner
3. Define role, behavior, voice, rules
4. Update `scripts/build/preamble-tiers.mjs` agent team list
5. Update `scripts/build/touchfiles.mjs` for relevant skills
6. Add to README.md agent table

## Adding a New Skill

1. Create `skills/{name}/SKILL.md.tmpl` (or SKILL.md)
2. Define triggers, usage, steps
3. Add touchfile entry in `scripts/build/touchfiles.mjs`
4. Run `npm run build:skills` to generate
5. Add tests in `tests/`

## Adding a Script Module

1. Create in appropriate `scripts/{domain}/` directory
2. Use ESM (import/export)
3. Import logger: `import { createLogger } from '../core/logger.mjs'`
4. Use atomic state: `import { readStateOrDefault, writeState } from '../core/state.mjs'`
5. Add JSDoc for all exported functions
6. Add tests
7. Never use `require()` in ESM files

## Code Style

- ESM only (no CommonJS require)
- Atomic file writes (temp+rename via state.mjs)
- Structured logging (createLogger pattern)
- Korean comments OK, English function/variable names
- No emoji in code (SVG icons for UI)
