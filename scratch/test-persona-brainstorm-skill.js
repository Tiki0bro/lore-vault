const fs = require('fs');
const path = require('path');

console.log('🧪 Running Persona Brainstorm Skill Verification Test...');

const skillPath = path.join(__dirname, '..', '.agents', 'skills', 'persona-brainstorm', 'SKILL.md');

// 1. Check file existence
if (!fs.existsSync(skillPath)) {
  console.error(`❌ FAIL: Skill file does not exist at ${skillPath}`);
  process.exit(1);
}
console.log('✅ PASS: Skill file exists.');

const content = fs.readFileSync(skillPath, 'utf8');

// 2. Verify Frontmatter
if (!content.startsWith('---') || !content.includes('name: persona-brainstorm')) {
  console.error('❌ FAIL: Invalid frontmatter or missing name: persona-brainstorm');
  process.exit(1);
}

if (!content.includes('description: Use when')) {
  console.error('❌ FAIL: Description must start with "Use when"');
  process.exit(1);
}
console.log('✅ PASS: Frontmatter valid with correct description trigger.');

// 3. Verify 10 Personas presence
const requiredPersonas = [
  'Ethen',
  'Riley',
  'Alex',
  'Morgan',
  'Elena',
  'Maya',
  'Grant',
  'Merryn',
  'Marcus',
  'Arthur'
];

const missingPersonas = requiredPersonas.filter(persona => !content.includes(persona));
if (missingPersonas.length > 0) {
  console.error(`❌ FAIL: Missing required personas: ${missingPersonas.join(', ')}`);
  process.exit(1);
}
console.log('✅ PASS: All 10 LoreVault personas present in skill roster.');

// 4. Verify Workflow Phases
const requiredPhases = [
  'Phase 1: Individual Persona Pitching Round',
  'Phase 2: Socratic Filtering & PO Prioritization',
  'Phase 3: Top 3 Feature Selection',
  'Phase 4: Action-Ready Report Generation'
];

for (const phase of requiredPhases) {
  if (!content.includes(phase)) {
    console.error(`❌ FAIL: Missing required workflow phase: ${phase}`);
    process.exit(1);
  }
}
console.log('✅ PASS: All 4 execution phases documented.');

// 5. Verify Integration Slash Commands
if (!content.includes('/persona-brainstorm') || !content.includes('/feature-loop')) {
  console.error('❌ FAIL: Slash commands /persona-brainstorm or /feature-loop missing.');
  process.exit(1);
}
console.log('✅ PASS: Integration commands /persona-brainstorm and /feature-loop validated.');

console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!');
