/**
 * Code-Level Enforcement Tests
 * Tests: persistent-mode, story-tracker, architect-verify, error-recovery
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const TEST_DIR = join(import.meta.dirname, '.test-enforcement-tmp');

describe('Code-Level Enforcement', () => {
  before(() => {
    mkdirSync(join(TEST_DIR, '.aing', 'state'), { recursive: true });
  });

  after(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  // =========================================================================
  // persistent-mode.ts
  // =========================================================================
  describe('Persistent Mode', () => {
    let mod;
    before(async () => {
      mod = await import('../dist/scripts/hooks/persistent-mode.js');
    });

    it('should activate persistent mode with team config', async () => {
      await mod.activatePersistentMode(TEST_DIR, 'team', 'team pipeline active');
      const state = await mod.getPersistentModeState(TEST_DIR);
      assert.equal(state.active, true);
      assert.equal(state.mode, 'team');
      assert.equal(state.reason, 'team pipeline active');
    });

    it('should deactivate persistent mode', async () => {
      await mod.deactivatePersistentMode(TEST_DIR);
      const state = await mod.getPersistentModeState(TEST_DIR);
      assert.equal(state.active, false);
      assert.equal(state.mode, 'team');
    });

    it('should increment iteration and extend soft cap', async () => {
      // Re-activate with iteration near max
      const { writeState } = await import('../dist/scripts/core/state.js');
      writeState(join(TEST_DIR, '.aing', 'state', 'persistent-mode.json'), {
        active: true,
        mode: 'team',
        startedAt: new Date().toISOString(),
        reason: 'test',
        iteration: 9,
        maxIterations: 10,
      });

      const result = await mod.incrementIteration(TEST_DIR);
      assert.equal(result, true);

      const state = await mod.getPersistentModeState(TEST_DIR);
      assert.equal(state.iteration, 10);
      assert.equal(state.maxIterations, 13); // 10 + 3 soft cap extension
    });

    it('should track reinforcements and trip circuit breaker', async () => {
      // Activate fresh state
      const { writeState } = await import('../dist/scripts/core/state.js');
      writeState(join(TEST_DIR, '.aing', 'state', 'persistent-mode.json'), {
        active: true,
        mode: 'team',
        startedAt: new Date().toISOString(),
        reason: 'test',
        reinforcementCount: 19,
        lastReinforcedAt: new Date().toISOString(),
      });

      // 20th reinforcement — still OK
      const ok = await mod.recordReinforcement(TEST_DIR);
      assert.equal(ok, true);

      // 21st — circuit breaker trips
      const tripped = await mod.recordReinforcement(TEST_DIR);
      assert.equal(tripped, false);
    });

    it('should update fix loop count', async () => {
      const { writeState } = await import('../dist/scripts/core/state.js');
      writeState(join(TEST_DIR, '.aing', 'state', 'persistent-mode.json'), {
        active: true,
        mode: 'team',
        startedAt: new Date().toISOString(),
        reason: 'test',
      });

      await mod.updateFixLoop(TEST_DIR, 5);
      const state = await mod.getPersistentModeState(TEST_DIR);
      assert.equal(state.fixLoopCount, 5);
    });
  });

  // =========================================================================
  // story-tracker.ts
  // =========================================================================
  describe('Story Tracker (PRD)', () => {
    let mod;
    before(async () => {
      mod = await import('../dist/scripts/pipeline/story-tracker.js');
    });

    it('should create a PRD with stories', () => {
      const prd = mod.createPRD('auth-feature', [
        { id: 'US-001', title: 'Login flow', description: 'OAuth2 login', acceptanceCriteria: ['User can log in', 'Token stored in cookie'], priority: 1 },
        { id: 'US-002', title: 'Logout', description: 'Session destroy', acceptanceCriteria: ['Session cleared on logout'], priority: 2 },
      ], TEST_DIR);

      assert.equal(prd.stories.length, 2);
      assert.equal(prd.stories[0].passes, false);
      assert.equal(prd.feature, 'auth-feature');
    });

    it('should report correct PRD status', () => {
      const status = mod.getPRDStatus(TEST_DIR);
      assert.equal(status.total, 2);
      assert.equal(status.completed, 0);
      assert.equal(status.pending, 2);
      assert.equal(status.allComplete, false);
      assert.equal(status.nextStory.id, 'US-001'); // highest priority
    });

    it('should reject completion without evidence', () => {
      const result = mod.markStoryComplete(TEST_DIR, 'US-001', []);
      assert.equal(result, false);

      const status = mod.getPRDStatus(TEST_DIR);
      assert.equal(status.completed, 0); // still 0
    });

    it('should mark story complete with evidence', () => {
      const result = mod.markStoryComplete(TEST_DIR, 'US-001', [
        'tests/auth.test.ts:PASS (3/3)',
        'build: SUCCESS',
      ], 'Login flow verified');

      assert.equal(result, true);

      const status = mod.getPRDStatus(TEST_DIR);
      assert.equal(status.completed, 1);
      assert.equal(status.pending, 1);
      assert.equal(status.allComplete, false);
    });

    it('should detect all-complete when all stories pass', () => {
      mod.markStoryComplete(TEST_DIR, 'US-002', ['tests/logout.test.ts:PASS']);

      const status = mod.getPRDStatus(TEST_DIR);
      assert.equal(status.allComplete, true);
      assert.equal(status.completed, 2);
      assert.equal(status.pending, 0);
    });

    it('should revert a story', () => {
      mod.revertStory(TEST_DIR, 'US-002', 'Architect rejected — missing edge case');

      const status = mod.getPRDStatus(TEST_DIR);
      assert.equal(status.allComplete, false);
      assert.equal(status.completed, 1);
      assert.equal(status.incompleteIds[0], 'US-002');
    });
  });

  // =========================================================================
  // architect-verify.ts
  // =========================================================================
  describe('Architect Verification', () => {
    let mod;
    before(async () => {
      mod = await import('../dist/scripts/hooks/architect-verify.js');
    });

    it('should start verification', () => {
      const state = mod.startVerification(TEST_DIR, 'auth-feature', 'All tests pass, build clean');
      assert.equal(state.pending, true);
      assert.equal(state.feature, 'auth-feature');
      assert.equal(state.verificationAttempts, 0);
      assert.equal(state.tier, 'standard');
    });

    it('should read pending verification state', () => {
      const state = mod.getVerifyState(TEST_DIR);
      assert.ok(state);
      assert.equal(state.pending, true);
    });

    it('should record rejection and allow retry', () => {
      const hasMore = mod.recordRejection(TEST_DIR, 'Missing edge case for expired tokens');
      assert.equal(hasMore, true); // 1/3 attempts, more remain

      const state = mod.getVerifyState(TEST_DIR);
      assert.equal(state.verificationAttempts, 1);
      assert.equal(state.architectFeedback, 'Missing edge case for expired tokens');
    });

    it('should exhaust attempts after max rejections', () => {
      mod.recordRejection(TEST_DIR, 'Still missing');  // 2/3
      const hasMore = mod.recordRejection(TEST_DIR, 'Still broken'); // 3/3
      assert.equal(hasMore, false); // exhausted

      const state = mod.getVerifyState(TEST_DIR);
      assert.equal(state, null); // pending cleared
    });

    it('should record approval', () => {
      mod.startVerification(TEST_DIR, 'auth-feature', 'Fixed all issues');
      mod.recordApproval(TEST_DIR);

      const state = mod.getVerifyState(TEST_DIR);
      assert.equal(state, null); // pending cleared after approval
    });

    it('should determine tier based on file count', () => {
      assert.equal(mod.determineTier(5, false), 'standard');
      assert.equal(mod.determineTier(25, false), 'thorough');
      assert.equal(mod.determineTier(3, true), 'thorough');
    });

    it('should generate architect prompt', () => {
      const state = mod.startVerification(TEST_DIR, 'test', 'claim', { tier: 'thorough' });
      const prompt = mod.generateArchitectPrompt(state);
      assert.ok(prompt.includes('VERIFICATION PENDING'));
      assert.ok(prompt.includes('thorough'));
      assert.ok(prompt.includes('opus'));
      mod.clearVerification(TEST_DIR);
    });
  });

  // =========================================================================
  // error-recovery.ts
  // =========================================================================
  describe('Error Recovery', () => {
    let mod;
    before(async () => {
      mod = await import('../dist/scripts/hooks/error-recovery.js');
    });

    it('should return no guidance for first error', () => {
      const { guidance, forceAlternative } = mod.recordToolError(TEST_DIR, 'Bash', 'Error: ENOENT');
      assert.equal(guidance, null);
      assert.equal(forceAlternative, false);
    });

    it('should suggest alternative after 4 repeats', () => {
      // Record 3 more (total 4)
      mod.recordToolError(TEST_DIR, 'Bash', 'Error: ENOENT');
      mod.recordToolError(TEST_DIR, 'Bash', 'Error: ENOENT');
      const { guidance, forceAlternative } = mod.recordToolError(TEST_DIR, 'Bash', 'Error: ENOENT');
      assert.ok(guidance);
      assert.ok(guidance.includes('RETRY GUIDANCE'));
      assert.equal(forceAlternative, false);
    });

    it('should force alternative after 6 repeats', () => {
      mod.recordToolError(TEST_DIR, 'Bash', 'Error: ENOENT');
      const { guidance, forceAlternative } = mod.recordToolError(TEST_DIR, 'Bash', 'Error: ENOENT');
      assert.ok(guidance);
      assert.ok(guidance.includes('FORCE ALTERNATIVE'));
      assert.equal(forceAlternative, true);
    });

    it('should clear errors for a tool after success', () => {
      mod.clearToolErrors(TEST_DIR, 'Bash');
      const { guidance } = mod.recordToolError(TEST_DIR, 'Bash', 'Error: ENOENT');
      assert.equal(guidance, null); // reset — first error again
    });

    it('should track different error signatures separately', () => {
      mod.clearToolErrors(TEST_DIR, 'Bash');
      mod.recordToolError(TEST_DIR, 'Bash', 'Error: ENOENT file not found');
      mod.recordToolError(TEST_DIR, 'Bash', 'TypeError: Cannot read property');
      // 1 each — neither should trigger guidance
      const { guidance } = mod.recordToolError(TEST_DIR, 'Bash', 'Error: ENOENT file not found');
      assert.equal(guidance, null); // only 2nd occurrence of ENOENT
    });
  });

  // =========================================================================
  // Handoff Manager (new fields)
  // =========================================================================
  describe('Handoff Manager (structured fields)', () => {
    let mod;
    before(async () => {
      mod = await import('../dist/scripts/pipeline/handoff-manager.js');
    });

    it('should write handoff with rejected/risks/files/remaining fields', () => {
      const result = mod.writeHandoff({
        feature: 'enforcement-test',
        stage: 'team-exec',
        summary: 'Execution complete with 3 tasks',
        decisions: ['Used JWT for auth', 'Redis for sessions'],
        rejected: ['Considered Paseto — incompatible with existing middleware'],
        risks: ['Token rotation not implemented yet'],
        filesChanged: ['src/auth/jwt.ts', 'src/middleware/session.ts'],
        remaining: ['Add token refresh endpoint'],
        nextStage: 'team-verify',
      }, TEST_DIR);

      assert.equal(result.ok, true);

      const content = mod.readHandoff('enforcement-test', 'team-exec', TEST_DIR);
      assert.ok(content.includes('Rejected Alternatives'));
      assert.ok(content.includes('Paseto'));
      assert.ok(content.includes('Risks for Next Stage'));
      assert.ok(content.includes('Token rotation'));
      assert.ok(content.includes('Files Changed'));
      assert.ok(content.includes('jwt.ts'));
      assert.ok(content.includes('Remaining Items'));
      assert.ok(content.includes('token refresh'));
    });
  });
});
