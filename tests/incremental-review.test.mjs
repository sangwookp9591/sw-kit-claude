import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { filterReviewScope } from '../dist/scripts/review/incremental-review.js';

describe('incremental-review', () => {
  describe('filterReviewScope', () => {
    it('returns incremental mode when changed files match', () => {
      const allFiles = ['/project/src/a.ts', '/project/src/b.ts', '/project/src/c.ts'];
      const changedFiles = ['src/a.ts'];

      const result = filterReviewScope(allFiles, changedFiles);
      assert.equal(result.mode, 'incremental');
      assert.ok(result.reviewedFiles.includes('/project/src/a.ts'));
      assert.ok(result.skippedFiles.includes('/project/src/b.ts'));
      assert.ok(result.skippedFiles.includes('/project/src/c.ts'));
    });

    it('returns full mode when changedFiles is empty', () => {
      const allFiles = ['/project/src/a.ts', '/project/src/b.ts'];
      const result = filterReviewScope(allFiles, []);
      assert.equal(result.mode, 'full');
      assert.deepEqual(result.reviewedFiles, allFiles);
      assert.deepEqual(result.skippedFiles, []);
    });

    it('returns full mode when no allFiles match changedFiles', () => {
      const allFiles = ['/project/src/x.ts'];
      const changedFiles = ['src/completely-unrelated.ts'];

      const result = filterReviewScope(allFiles, changedFiles);
      assert.equal(result.mode, 'full');
      assert.deepEqual(result.reviewedFiles, allFiles);
    });

    it('sets changedFiles in result', () => {
      const allFiles = ['/project/src/a.ts'];
      const changedFiles = ['src/a.ts'];

      const result = filterReviewScope(allFiles, changedFiles);
      assert.deepEqual(result.changedFiles, changedFiles);
    });

    it('handles exact path match', () => {
      const allFiles = ['src/a.ts', 'src/b.ts'];
      const changedFiles = ['src/a.ts'];

      const result = filterReviewScope(allFiles, changedFiles);
      assert.equal(result.mode, 'incremental');
      assert.ok(result.reviewedFiles.includes('src/a.ts'));
      assert.ok(result.skippedFiles.includes('src/b.ts'));
    });

    it('multiple changed files all included in reviewedFiles', () => {
      const allFiles = ['/p/a.ts', '/p/b.ts', '/p/c.ts'];
      const changedFiles = ['a.ts', 'b.ts'];

      const result = filterReviewScope(allFiles, changedFiles);
      assert.equal(result.mode, 'incremental');
      assert.equal(result.reviewedFiles.length, 2);
      assert.equal(result.skippedFiles.length, 1);
    });
  });
});
