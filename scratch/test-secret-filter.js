const assert = require('assert');
const { stripSecretBlocks } = require('../server');

const sampleMarkdown = `
# Public Title
Overview text.
[secret]This is a DM-only secret note.[/secret]
Public section text.
[dm]Another DM note here.[/dm]
Conclusion text.
`;

const cleanText = stripSecretBlocks ? stripSecretBlocks(sampleMarkdown) : sampleMarkdown;
console.log('Cleaned output:\n', cleanText);

assert(typeof stripSecretBlocks === 'function', 'stripSecretBlocks function must be exported from server.js');
assert(!cleanText.includes('DM-only secret note'), 'Failed to strip [secret] block');
assert(!cleanText.includes('Another DM note'), 'Failed to strip [dm] block');
assert(cleanText.includes('Public section text'), 'Stripped public content by mistake');
console.log('✅ Secret filter unit test passed!');
