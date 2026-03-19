/**
 * sw-kit UserPromptSubmit Hook v1.5.0
 */
import { readStdinJSON } from '../scripts/core/stdin.mjs';
import { detectIntent } from '../scripts/i18n/intent-detector.mjs';

try {
  const parsed = await readStdinJSON();
  const prompt = parsed.prompt || parsed.user_prompt || parsed.content || '';

  if (!prompt) { process.stdout.write('{}'); process.exit(0); }

  const intent = detectIntent(prompt);
  const parts = [];

  if (intent.isWizardMode) {
    parts.push('[sw-kit] Iron wizard mode activated. Guide the non-developer step by step.');
    parts.push('Use the wizard agent (agents/wizard.md) to run the full pipeline with simple language.');
  } else if (intent.pdcaStage === 'plan') {
    parts.push('[sw-kit] Planning detected. Use Able (PM) + Klay (Architect) to create the plan.');
    parts.push('Steps: 1) Klay scans codebase 2) Able creates plan in .sw-kit/plans/ 3) Task checklist auto-generated');
    parts.push('After planning: run "/swkit auto <feature> <task>" to execute with the full team.');
  } else if (intent.pdcaStage === 'do') {
    parts.push('[sw-kit] Implementation detected. Use Jay (Backend) + Derek (Frontend) with TDD enforced.');
    parts.push('Or run "/swkit auto <feature> <task>" for full pipeline: Klay->Able->Jay+Derek->Milla->Sam');
  } else if (intent.pdcaStage === 'check') {
    parts.push('[sw-kit] Verification detected. Use Milla (Security review) + Sam (Evidence chain verification).');
    parts.push('Evidence required: test results + build status + lint check. No evidence = no "done".');
  } else if (intent.pdcaStage === 'act') {
    parts.push('[sw-kit] Improvement detected. Fix issues found in Check stage, then re-verify.');
  } else if (intent.agent === 'explorer') {
    parts.push('[sw-kit] Codebase exploration detected. Klay (Architect) will scan and map the structure.');
  }

  process.stdout.write(parts.length > 0
    ? JSON.stringify({ hookSpecificOutput: { additionalContext: parts.join('\n') } })
    : '{}');
} catch (err) {
  process.stderr.write(`[sw-kit:user-prompt] ${err.message}\n`);
  process.stdout.write('{}');
}
