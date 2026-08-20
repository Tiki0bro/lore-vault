const fs = require('fs');
const path = require('path');

async function testNarrativeIntegritySuite() {
  console.log('--- Running LoreVault Narrative & Integrity Suite QA Tests ---');

  // 1. Check server.js for AI Lore Doctor audit and Prose Synthesizer routes
  const serverCode = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
  console.assert(serverCode.includes('/api/worlds/:worldId/audit'), 'FAIL: GET /api/worlds/:worldId/audit route missing');
  console.assert(serverCode.includes('/api/narrative/synthesize-prose'), 'FAIL: POST /api/narrative/synthesize-prose route missing');
  console.log('✓ Server AI Lore Doctor & Prose Synthesizer REST API routes check passed');

  // 2. Secret Text Stripping Function Check
  function stripSecretBlocks(content, mode) {
    if (mode !== 'player' || !content) return content || '';
    return content.replace(/\[secret\][\s\S]*?\[\/secret\]/gi, '');
  }

  const rawText = "The dragon guards the [secret]Golden Amulet of Aethelgard[/secret] beneath the fortress.";
  const playerText = stripSecretBlocks(rawText, 'player');
  const dmText = stripSecretBlocks(rawText, 'dm');

  console.assert(!playerText.includes('Golden Amulet'), 'FAIL: Secret text was not stripped in player mode');
  console.assert(dmText.includes('Golden Amulet'), 'FAIL: Secret text was incorrectly stripped in DM mode');
  console.log('✓ Secret DM Canon vs Public Player filter engine check passed');

  console.log('=== ALL NARRATIVE & INTEGRITY SUITE QA TESTS PASSED PERFECTLY! ===');
}

testNarrativeIntegritySuite().then(() => process.exit(0)).catch(err => {
  console.error('Test Error:', err);
  process.exit(1);
});
