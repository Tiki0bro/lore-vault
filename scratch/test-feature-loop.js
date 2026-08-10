const fs = require('fs');
const path = require('path');

const skillPath = path.join(__dirname, '../.agents/skills/feature-loop/SKILL.md');

console.log('Testing Feature Loop Skill setup...');

if (!fs.existsSync(skillPath)) {
  console.error('FAIL: Skill file does not exist at', skillPath);
  process.exit(1);
}

const content = fs.readFileSync(skillPath, 'utf8');

const requiredTokens = [
  'name: feature-loop',
  'Arthur "The Griller" Vance',
  'GATE 1',
  'GATE 2',
  'GATE 3',
  'GATE 4',
  '01-ideation-grill.md',
  '02-design-spec.md',
  '03-implementation-plan.md',
  '04-qa-verification.md',
  '05-customer-feedback.md',
  '06-release-retrospective.md',
  'ARTHUR\'S GRILLING REPORT & GATE CHECKPOINT'
];

let failed = false;
for (const token of requiredTokens) {
  if (!content.includes(token)) {
    console.error(`FAIL: Skill file missing required token: "${token}"`);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log('PASS: Feature Loop Skill verified successfully!');
