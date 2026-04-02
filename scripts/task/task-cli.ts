/**
 * aing Task CLI — command-line interface for task-manager.
 * Usage:
 *   node task-cli.js create --title "Task" --subtasks "s1,s2,s3" --dir /path
 *   node task-cli.js check --id task-123 --seq 1 --dir /path
 *   node task-cli.js list --dir /path
 *   node task-cli.js show --id task-123 --dir /path
 *   node task-cli.js add --id task-123 --subtask "new step" --dir /path
 * @module scripts/task/task-cli
 */

import {
  createTask,
  checkSubtask,
  listTasks,
  addSubtask,
  formatTaskChecklist,
  formatAllTasks,
} from './task-manager.js';

function parseArgs(args: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  const command = args[0];
  if (command && !command.startsWith('--')) result._command = command;

  for (let i = command && !command.startsWith('--') ? 1 : 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--') && i + 1 < args.length) {
      result[arg.slice(2)] = args[++i];
    }
  }
  return result;
}

const args = parseArgs(process.argv.slice(2));
const command = args._command || 'help';
const dir = args.dir || process.cwd();

switch (command) {
  case 'create': {
    const title = args.title;
    if (!title) {
      console.error('Error: --title required');
      process.exit(1);
    }
    const subtaskTitles = (args.subtasks || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    const result = createTask(
      { title, subtasks: subtaskTitles.map(t => ({ title: t })) },
      dir,
    );
    if (result.ok) {
      console.log(JSON.stringify({ ok: true, taskId: result.taskId, subtasks: result.task.subtasks.length }));
    } else {
      console.error('Error: failed to create task');
      process.exit(1);
    }
    break;
  }

  case 'check': {
    const id = args.id;
    const seq = parseInt(args.seq, 10);
    if (!id || isNaN(seq)) {
      console.error('Error: --id and --seq required');
      process.exit(1);
    }
    const result = checkSubtask(id, seq, dir);
    console.log(JSON.stringify(result));
    break;
  }

  case 'list': {
    const tasks = listTasks(dir);
    if (tasks.length === 0) {
      console.log('No tasks found.');
    } else {
      console.log(formatAllTasks(dir));
    }
    break;
  }

  case 'show': {
    const id = args.id;
    if (!id) {
      console.error('Error: --id required');
      process.exit(1);
    }
    console.log(formatTaskChecklist(id, dir));
    break;
  }

  case 'add': {
    const id = args.id;
    const subtaskTitle = args.subtask;
    if (!id || !subtaskTitle) {
      console.error('Error: --id and --subtask required');
      process.exit(1);
    }
    const result = addSubtask(id, { title: subtaskTitle }, dir);
    console.log(JSON.stringify(result));
    break;
  }

  default:
    console.log(`aing task-cli

Commands:
  create  --title "..." --subtasks "s1,s2,s3" [--dir path]
  check   --id task-xxx --seq N [--dir path]
  list    [--dir path]
  show    --id task-xxx [--dir path]
  add     --id task-xxx --subtask "..." [--dir path]`);
}
