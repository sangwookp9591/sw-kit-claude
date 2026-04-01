import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const MOD_PATH = '../dist/scripts/review/incremental-review.js';

describe('determineScope', () => {
  it('UI 파일이 있으면 design-review를 추천한다', async () => {
    const { determineScope } = await import(MOD_PATH);
    const files = [
      { path: 'src/components/Button.tsx', status: 'modified', additions: 10, deletions: 5 },
    ];
    const scope = determineScope(files);
    assert.ok(scope.suggestedTiers.includes('design-review'));
  });

  it('보안 관련 파일이 있으면 outside-voice를 추천한다', async () => {
    const { determineScope } = await import(MOD_PATH);
    const files = [
      { path: 'src/middleware/auth-guard.ts', status: 'modified', additions: 20, deletions: 3 },
    ];
    const scope = determineScope(files);
    assert.ok(scope.suggestedTiers.includes('outside-voice'));
  });

  it('eng-review는 항상 포함된다', async () => {
    const { determineScope } = await import(MOD_PATH);
    const files = [
      { path: 'src/utils/helper.ts', status: 'modified', additions: 5, deletions: 2 },
    ];
    const scope = determineScope(files);
    assert.ok(scope.suggestedTiers.includes('eng-review'));
  });

  it('큰 변경(500줄+)은 outside-voice를 추가한다', async () => {
    const { determineScope } = await import(MOD_PATH);
    const files = [
      { path: 'src/core/engine.ts', status: 'modified', additions: 400, deletions: 200 },
    ];
    const scope = determineScope(files);
    assert.ok(scope.suggestedTiers.includes('outside-voice'));
  });

  it('totalAdditions/totalDeletions를 집계한다', async () => {
    const { determineScope } = await import(MOD_PATH);
    const files = [
      { path: 'a.ts', status: 'modified', additions: 10, deletions: 5 },
      { path: 'b.ts', status: 'added', additions: 20, deletions: 0 },
    ];
    const scope = determineScope(files);
    assert.equal(scope.totalAdditions, 30);
    assert.equal(scope.totalDeletions, 5);
  });
});

describe('filterToChangedPaths', () => {
  it('변경된 파일만 필터링한다', async () => {
    const { filterToChangedPaths } = await import(MOD_PATH);
    const allPaths = ['src/a.ts', 'src/b.ts', 'src/c.ts'];
    const changed = [
      { path: 'src/a.ts', status: 'modified', additions: 1, deletions: 0 },
      { path: 'src/c.ts', status: 'added', additions: 5, deletions: 0 },
    ];
    const result = filterToChangedPaths(allPaths, changed);
    assert.deepStrictEqual(result, ['src/a.ts', 'src/c.ts']);
  });
});

describe('selectTiers with incremental mode', () => {
  it('incremental 모드에서 incrementalTiers를 사용한다', async () => {
    const { selectTiers } = await import('../dist/scripts/review/review-engine.js');
    const tiers = selectTiers('low', {
      mode: 'incremental',
      incrementalTiers: ['eng-review', 'design-review'],
    });
    assert.deepStrictEqual(tiers, ['eng-review', 'design-review']);
  });

  it('mode 미지정이면 기존 로직 사용', async () => {
    const { selectTiers } = await import('../dist/scripts/review/review-engine.js');
    const tiers = selectTiers('low');
    assert.deepStrictEqual(tiers, ['eng-review']);
  });

  it('incremental + incrementalTiers 빈 배열이면 기존 로직', async () => {
    const { selectTiers } = await import('../dist/scripts/review/review-engine.js');
    const tiers = selectTiers('high', {
      mode: 'incremental',
      incrementalTiers: [],
      hasProductChange: true,
    });
    // Falls through to full mode
    assert.ok(tiers.includes('eng-review'));
    assert.ok(tiers.includes('outside-voice'));
  });
});
