/**
 * sw-kit UserPromptSubmit Hook Handler v1.3.2
 * Uses process.stdin async read (ESM-compatible).
 */
import { detectIntent } from '../scripts/i18n/intent-detector.mjs';

const chunks = [];
process.stdin.setEncoding('utf-8');
process.stdin.on('data', c => chunks.push(c));
process.stdin.on('end', () => {
  try {
    const raw = chunks.join('');
    if (!raw || !raw.trim()) { out({}); return; }

    const parsed = JSON.parse(raw);
    const prompt = parsed.prompt || parsed.user_prompt || parsed.content || '';
    if (!prompt) { out({}); return; }

    const intent = detectIntent(prompt);
    const parts = [];
    if (intent.agent) parts.push(`Suggested agent: sw-kit:${intent.agent}`);
    if (intent.pdcaStage) parts.push(`PDCA stage hint: ${intent.pdcaStage}`);
    if (intent.isWizardMode) parts.push('Wizard mode detected -- guide the user step by step');

    if (parts.length > 0) {
      out({ hookSpecificOutput: { additionalContext: parts.join(' | ') } });
    } else {
      out({});
    }
  } catch (err) {
    process.stderr.write(`[sw-kit:user-prompt] ${err.message}\n`);
    out({});
  }
});

function out(obj) { process.stdout.write(JSON.stringify(obj)); }
