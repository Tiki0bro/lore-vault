const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const action = process.argv[2];
const planFile = process.argv[3];

if (!action || !planFile) {
  console.error('Usage: node scratch/sdd-helper.js <workspace|task-brief|review-package> <plan-file> [arg3] [arg4]');
  process.exit(1);
}

const repoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
const planBasename = path.basename(planFile, '.md');
const workspaceDir = path.join(repoRoot, '.superpowers', 'sdd', planBasename);

// Ensure workspace directory exists
fs.mkdirSync(workspaceDir, { recursive: true });
fs.writeFileSync(path.join(repoRoot, '.superpowers', 'sdd', '.gitignore'), '*\n');

if (action === 'workspace') {
  console.log(workspaceDir);
  process.exit(0);
}

if (action === 'task-brief') {
  const taskNum = process.argv[4];
  if (!taskNum) {
    console.error('Usage: node scratch/sdd-helper.js task-brief <plan-file> <task-number>');
    process.exit(1);
  }
  const planContent = fs.readFileSync(planFile, 'utf8');
  const lines = planContent.split('\n');
  let inFenced = false;
  let inTask = false;
  const taskLines = [];
  const taskRegex = new RegExp(`^#+\\s+Task\\s+${taskNum}(?:[^0-9]|$)`, 'i');

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      inFenced = !inFenced;
    }
    if (!inFenced && /^#+\s+Task\s+[0-9]+/i.test(line)) {
      inTask = taskRegex.test(line);
    }
    if (inTask) {
      taskLines.push(line);
    }
  }

  if (taskLines.length === 0) {
    console.error(`Task ${taskNum} not found in ${planFile}`);
    process.exit(1);
  }

  const outFile = path.join(workspaceDir, `task-${taskNum}-brief.md`);
  fs.writeFileSync(outFile, taskLines.join('\n'));
  console.log(`wrote ${outFile}: ${taskLines.length} lines`);
  process.exit(0);
}

if (action === 'review-package') {
  const base = process.argv[4];
  const head = process.argv[5] || 'HEAD';
  if (!base) {
    console.error('Usage: node scratch/sdd-helper.js review-package <plan-file> <base> [head]');
    process.exit(1);
  }

  const baseShort = execSync(`git rev-parse --short ${base}`, { encoding: 'utf8' }).trim();
  const headShort = execSync(`git rev-parse --short ${head}`, { encoding: 'utf8' }).trim();
  const outFile = path.join(workspaceDir, `review-${baseShort}..${headShort}.diff`);

  const commits = execSync(`git log --oneline ${base}..${head}`, { encoding: 'utf8' });
  const stat = execSync(`git diff --stat ${base}..${head}`, { encoding: 'utf8' });
  const diff = execSync(`git diff -U10 ${base}..${head}`, { encoding: 'utf8' });

  const content = `# Review package: ${base}..${head}\n\n## Commits\n${commits}\n## Files changed\n${stat}\n## Diff\n${diff}\n`;
  fs.writeFileSync(outFile, content);
  console.log(`wrote ${outFile}`);
  process.exit(0);
}
