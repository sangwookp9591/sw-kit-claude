/**
 * sw-kit PreToolUse Hook Handler v0.3.0
 * Guardrail Engine + Safety Invariants + Dry-Run check before tool execution.
 */

import { createLogger } from '../scripts/core/logger.mjs';
import { checkBashCommand, checkFilePath, formatViolations } from '../scripts/guardrail/guardrail-engine.mjs';
import { checkStepLimit, checkFileChangeLimit, checkForbiddenPath } from '../scripts/guardrail/safety-invariants.mjs';
import { isDryRunActive, queueChange, formatPreview } from '../scripts/guardrail/dry-run.mjs';

const log = createLogger('pre-tool-use');

try {
  const chunks = [];
  process.stdin.setEncoding('utf-8');
  await new Promise((resolve) => {
    process.stdin.on('data', (chunk) => chunks.push(chunk));
    process.stdin.on('end', resolve);
    setTimeout(resolve, 2000);
  });

  const parsed = chunks.join('') ? JSON.parse(chunks.join('')) : {};
  const toolName = parsed.tool_name || '';
  const toolInput = parsed.tool_input || {};
  const projectDir = process.env.PROJECT_DIR || process.cwd();
  const contextParts = [];

  // Step limit invariant
  const stepCheck = checkStepLimit(projectDir);
  if (!stepCheck.ok) {
    contextParts.push(stepCheck.message);
  }

  // Bash guardrails
  if (toolName === 'Bash' && toolInput.command) {
    const result = checkBashCommand(toolInput.command, projectDir);
    if (!result.allowed) {
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: {
          decision: 'block',
          reason: formatViolations(result.violations)
        }
      }));
      process.exit(0);
    }
    if (result.violations.length > 0) {
      contextParts.push(formatViolations(result.violations));
    }
  }

  // File guardrails (Write/Edit)
  if ((toolName === 'Write' || toolName === 'Edit') && toolInput.file_path) {
    // Forbidden path check
    const forbidden = checkForbiddenPath(toolInput.file_path, projectDir);
    if (!forbidden.ok) {
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: {
          decision: 'block',
          reason: forbidden.message
        }
      }));
      process.exit(0);
    }

    // File change limit
    const fileCheck = checkFileChangeLimit(toolInput.file_path, projectDir);
    if (!fileCheck.ok) {
      contextParts.push(fileCheck.message);
    }

    // File pattern guardrail
    const fileResult = checkFilePath(toolInput.file_path, projectDir);
    if (fileResult.violations.length > 0) {
      contextParts.push(formatViolations(fileResult.violations));
    }

    // Dry-run mode
    if (isDryRunActive(projectDir)) {
      queueChange({
        type: toolName.toLowerCase(),
        target: toolInput.file_path,
        description: `${toolName} operation on ${toolInput.file_path}`
      }, projectDir);
      contextParts.push(formatPreview(projectDir));
    }
  }

  if (contextParts.length > 0) {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: { additionalContext: contextParts.join('\n\n') }
    }));
  } else {
    process.stdout.write(JSON.stringify({}));
  }

} catch (err) {
  log.error('Pre-tool-use failed', { error: err.message });
  process.stdout.write(JSON.stringify({}));
}
