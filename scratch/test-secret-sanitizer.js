const assert = require('assert');
const { app } = require('../server.js');

// Test stack-based secret sanitizer
function sanitizeSecretContent(content) {
  if (!content) return '';
  let result = '';
  let depth = 0;
  let i = 0;
  const openTag = '[secret]';
  const closeTag = '[/secret]';

  while (i < content.length) {
    const lower = content.toLowerCase();
    if (lower.startsWith(openTag, i)) {
      if (depth === 0) {
        result += ' *[Secret Details Redacted]* ';
      }
      depth++;
      i += openTag.length;
    } else if (lower.startsWith(closeTag, i)) {
      if (depth > 0) {
        depth--;
      }
      i += closeTag.length;
    } else {
      if (depth === 0) {
        result += content[i];
      }
      i++;
    }
  }
  return result;
}

// 1. Nested secret test
const nestedInput = 'Public Overview. [secret]Level 1 DM Note [secret]Level 2 Secret[/secret] Still secret[/secret] Public Conclusion.';
const nestedOutput = sanitizeSecretContent(nestedInput);
console.log('Nested Output:', nestedOutput);
assert(!nestedOutput.includes('Level 1'), 'Must strip Level 1 secret');
assert(!nestedOutput.includes('Level 2'), 'Must strip Level 2 secret');
assert(!nestedOutput.includes('Still secret'), 'Must strip outer secret portion');
assert(nestedOutput.includes('Public Overview'), 'Must keep public overview');

// 2. Unclosed secret test
const unclosedInput = 'Public Introduction. [secret]The Mayor is a Vampire Lord... (forgot to close tag)';
const unclosedOutput = sanitizeSecretContent(unclosedInput);
console.log('Unclosed Output:', unclosedOutput);
assert(!unclosedOutput.includes('Vampire Lord'), 'Must strip unclosed secret text');
assert(unclosedOutput.includes('Public Introduction'), 'Must keep public intro');

console.log('✅ Stack Sanitizer Security Tests Passed!');
