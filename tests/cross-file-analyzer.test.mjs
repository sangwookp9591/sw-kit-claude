/**
 * aing Cross-File Analyzer Test Suite
 * Tests import graph analysis, circular dep detection, depth limiting.
 *
 * Run: node --test tests/cross-file-analyzer.test.mjs
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const TEST_DIR = join(tmpdir(), `aing-cross-file-test-${Date.now()}`);
const MOD_PATH = '../dist/scripts/review/cross-file-analyzer.js';

before(() => {
  mkdirSync(join(TEST_DIR, 'src'), { recursive: true });
});

after(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('analyzeImports', () => {
  it('파일 간 import 관계를 추출한다', async () => {
    const { analyzeImports } = await import(MOD_PATH);
    const dir = join(TEST_DIR, 'src');
    writeFileSync(join(dir, 'a.ts'), `import { foo } from './b.js';`);
    writeFileSync(join(dir, 'b.ts'), `export const foo = 1;`);

    const result = analyzeImports([join(dir, 'a.ts')], TEST_DIR);
    assert.ok(result.imports.length >= 1);
    assert.equal(result.imports[0].source, join(dir, 'a.ts'));
  });

  it('depth limit 초과 시 탐색을 중단한다', async () => {
    const { analyzeImports } = await import(MOD_PATH);
    const chainDir = join(TEST_DIR, 'chain');
    mkdirSync(chainDir, { recursive: true });
    // d0 → d1 → d2 → d3 → d4
    for (let i = 0; i < 5; i++) {
      const content = i < 4
        ? `import { x } from './d${i + 1}.js';`
        : 'export const x = 1;';
      writeFileSync(join(chainDir, `d${i}.ts`), content);
    }
    const result = analyzeImports([join(chainDir, 'd0.ts')], TEST_DIR, 2);
    // Should stop before reaching d4
    assert.ok(result.depth <= 2);
  });

  it('depth limit 이내면 전체 탐색', async () => {
    const { analyzeImports } = await import(MOD_PATH);
    const shallowDir = join(TEST_DIR, 'shallow');
    mkdirSync(shallowDir, { recursive: true });
    writeFileSync(join(shallowDir, 'root.ts'), `import { x } from './leaf.js';`);
    writeFileSync(join(shallowDir, 'leaf.ts'), 'export const x = 1;');
    const result = analyzeImports([join(shallowDir, 'root.ts')], TEST_DIR, 3);
    assert.ok(result.imports.length >= 1);
  });

  it('node 내장 모듈은 무시한다', async () => {
    const { analyzeImports } = await import(MOD_PATH);
    const nodeDir = join(TEST_DIR, 'node-test');
    mkdirSync(nodeDir, { recursive: true });
    writeFileSync(join(nodeDir, 'main.ts'), `import { readFileSync } from 'node:fs';`);
    const result = analyzeImports([join(nodeDir, 'main.ts')], TEST_DIR);
    // node:fs should not appear as import target
    assert.equal(result.imports.length, 0);
  });
});

describe('detectCircularDeps', () => {
  it('순환 참조를 감지한다', async () => {
    const { detectCircularDeps } = await import(MOD_PATH);
    const edges = [
      { source: '/a.ts', target: '/b.ts', specifiers: ['x'] },
      { source: '/b.ts', target: '/c.ts', specifiers: ['y'] },
      { source: '/c.ts', target: '/a.ts', specifiers: ['z'] },
    ];
    const cycles = detectCircularDeps(edges);
    assert.ok(cycles.length > 0, 'Should detect at least one cycle');
    const flatCycle = cycles[0];
    assert.ok(flatCycle.includes('/a.ts'));
    assert.ok(flatCycle.includes('/b.ts'));
    assert.ok(flatCycle.includes('/c.ts'));
  });

  it('순환 없으면 빈 배열', async () => {
    const { detectCircularDeps } = await import(MOD_PATH);
    const edges = [
      { source: '/a.ts', target: '/b.ts', specifiers: ['x'] },
      { source: '/b.ts', target: '/c.ts', specifiers: ['y'] },
    ];
    const cycles = detectCircularDeps(edges);
    assert.deepStrictEqual(cycles, []);
  });

  it('빈 입력은 빈 배열', async () => {
    const { detectCircularDeps } = await import(MOD_PATH);
    assert.deepStrictEqual(detectCircularDeps([]), []);
  });
});
