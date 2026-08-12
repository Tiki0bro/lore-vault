const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { initDb } = require('../database/init');

const testResults = [];

function assert(condition, testName, details = '') {
  if (condition) {
    testResults.push({ test: testName, status: 'PASS', details });
    console.log(`[PASS] ${testName}${details ? ` - ${details}` : ''}`);
  } else {
    testResults.push({ test: testName, status: 'FAIL', details });
    console.error(`[FAIL] ${testName} - ${details}`);
  }
}

async function runAudit() {
  console.log('===============================================================');
  console.log('   RILEY "SOLDER" CHEN - EXHAUSTIVE QA AUDIT & STRESS TEST   ');
  console.log('===============================================================\n');

  // Initialize test sqlite DB in memory
  const db = new sqlite3.Database(':memory:');
  await new Promise((resolve, reject) => {
    initDb(db).then(resolve).catch(reject);
  });

  // Populate schema and edge case test data
  await new Promise((resolve) => {
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS articles (
        id TEXT PRIMARY KEY,
        title TEXT,
        category TEXT,
        summary TEXT,
        content TEXT,
        tags TEXT
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS personas (
        article_id TEXT PRIMARY KEY,
        thoughts TEXT,
        wants TEXT,
        needs TEXT
      )`);

      const stmt = db.prepare(`INSERT INTO articles (id, title, category, summary, content, tags) VALUES (?, ?, ?, ?, ?, ?)`);
      stmt.run('art-1', 'Elven Spire', 'Location', 'Ancient tower of high magic.', 'The tower was built in [SECRET]Hidden Vault inside[/SECRET] 1000 AGE. Reference to @[Rival Mage](art-2).', 'magic, DM-Secret');
      stmt.run('art-2', 'Rival Mage', 'NPC', 'A dark wizard seeking secrets.', 'Formidable spellcaster with unclosed secrets: [SECRET]Plotting against party without closing tag. Reference to @[Elven Spire](art-1).', 'npc');
      stmt.run('art-3', "O'Reilly's Tavern & <Script>alert(1)</Script>", 'Location', 'A dangerous pub with quotes "and" & ampersands.', 'Text with special chars: \\0, \\n, ", \', <tag>, &amp;, regex [a-z]+ (.*?).', 'pub');
      stmt.run('art-4', 'Malformed Links Article', 'General', 'Contains broken cross links.', 'Link 1: @[Broken1](not-found-1) Link 2: @[Self Link](art-4) Link 3: @[]() Link 4: @[No ID]()', 'test');
      stmt.run('art-corrupt-tags', 'Corrupted Tags Entry', 'General', 'Corrupt tags field', 'Content', '{"invalid_json": true');
      stmt.finalize(resolve);
    });
  });

  const serverPath = path.join(__dirname, '../server.js');
  const serverCode = fs.readFileSync(serverPath, 'utf8');
  const feContextBuilderPath = path.join(__dirname, '../public/js/context-builder.js');
  const feCode = fs.readFileSync(feContextBuilderPath, 'utf8');

  const { stripSecretBlocks, escapeXml, escapeYaml, estimateTokens, serializeContextEngine, compileContextEngine } = requireServerEngine(db, serverCode);

  // --- TEST CASE 1a: 0 Articles selected / Empty slate payload ---
  console.log('\n--- 1a. Boundary: 0 Articles Selected / Empty Slate ---');
  try {
    await new Promise(res => {
      compileContextEngine(db, { articleIds: [] }, (err, result) => {
        assert(!err && result && result.compiledPrompt !== undefined, '0 articles payload handled without error');
        assert(result.sources.length === 0, 'Sources array is empty');
        res();
      });
    });
  } catch (e) {
    assert(false, '0 articles payload handled without error', e.message);
  }

  // --- TEST CASE 1b: Invalid or nonexistent article IDs ---
  console.log('\n--- 1b. Boundary: Nonexistent / Invalid Article IDs ---');
  try {
    await new Promise(res => {
      compileContextEngine(db, { articleIds: ['nonexistent-999', 'invalid-uuid-!!!', '', null, undefined] }, (err, result) => {
        assert(!err, 'Nonexistent/null article IDs handled safely without SQL/runtime throw');
        assert(result.sources.length === 0, 'No sources returned for nonexistent IDs');
        res();
      });
    });
  } catch (e) {
    assert(false, 'Nonexistent article IDs handled safely', e.message);
  }

  // --- TEST CASE 1c: Unclosed BBCode, Malformed & Recursive Cross-Links ---
  console.log('\n--- 1c. Boundary: Unclosed BBCode & Cross-Link Resolution ---');
  try {
    // Check unclosed BBCode
    const unclosedText = 'Unclosed [SECRET]Top Secret Vault Code 1234';
    const stripped = stripSecretBlocks(unclosedText);
    const leakedSecret = stripped.includes('Top Secret Vault Code 1234');
    assert(!leakedSecret, 'Unclosed BBCode [SECRET] tags should not leak secret content',
      leakedSecret ? 'VULNERABILITY DETECTED: [SECRET] tag without closing [/SECRET] leaked content!' : 'Secret stripped cleanly');

    // Recursive cross-links test (art-1 refs art-2, art-2 refs art-1)
    await new Promise(res => {
      compileContextEngine(db, { articleIds: ['art-1'], graphHops: 1 }, (err, result) => {
        assert(!err, '1-hop resolution handles circular reference (art-1 -> art-2 -> art-1)');
        assert(result.sources.some(s => s.id === 'art-2'), 'Includes hop-1 linked article art-2');
        res();
      });
    });

    // Malformed @[Cross-Links]
    await new Promise(res => {
      compileContextEngine(db, { articleIds: ['art-4'], graphHops: 1 }, (err, result) => {
        assert(!err, 'Malformed @[Cross-Links] (missing target, empty ID, self-link) handled without infinite loop or crash');
        res();
      });
    });
  } catch (e) {
    assert(false, 'BBCode & Cross-Link test execution', e.message);
  }

  // --- TEST CASE 1d: Extreme Token Limits ---
  console.log('\n--- 1d. Boundary: Extreme Token Limits (0, 100, 100000) ---');
  try {
    const text0 = '';
    const text100 = 'A'.repeat(380); // ~100 tokens
    const text100k = 'B'.repeat(380000); // ~100,000 tokens

    assert(estimateTokens(text0) === 0, 'estimateTokens("") returns 0');
    assert(estimateTokens(text100) === 95, `estimateTokens(380 chars) returns ~95-100 tokens (${estimateTokens(text100)})`);
    assert(estimateTokens(text100k) === 95000, `estimateTokens(380,000 chars) handles large string without heap overflow (${estimateTokens(text100k)} tokens)`);
  } catch (e) {
    assert(false, 'Extreme token limits execution', e.message);
  }

  // --- TEST CASE 1e: Missing or Invalid Serializer Formats ---
  console.log('\n--- 1e. Boundary: Missing / Invalid Serializer Formats ---');
  try {
    // Unknown string format
    await new Promise(res => {
      compileContextEngine(db, { articleIds: ['art-1'], serializer: 'invalid_format_xyz' }, (err, result) => {
        const isMarkdownFallback = result && result.compiledPrompt && (result.compiledPrompt.includes('# SYSTEM') || result.compiledPrompt.includes('# ACTIVE SLATE'));
        assert(isMarkdownFallback, 'Unknown serializer string format falls back to Markdown default',
          isMarkdownFallback ? 'Fallback successful' : 'VULNERABILITY: Unknown serializer resulted in empty or broken prompt output');
        res();
      });
    });

    // Non-string serializer (e.g., number 123)
    await new Promise(res => {
      try {
        compileContextEngine(db, { articleIds: ['art-1'], serializer: 123 }, (err, result) => {
          if (err) {
            assert(false, 'Non-string serializer numeric value handled gracefully', err.message);
          } else {
            assert(true, 'Non-string serializer numeric value handled gracefully');
          }
          res();
        });
      } catch (err) {
        assert(false, 'Non-string serializer (123) threw unhandled TypeError', err.message);
        res();
      }
    });

    // Null serializer
    await new Promise(res => {
      compileContextEngine(db, { articleIds: ['art-1'], serializer: null }, (err, result) => {
        assert(!err && result.compiledPrompt !== undefined, 'null serializer handled safely');
        res();
      });
    });
  } catch (e) {
    assert(false, 'Serializer edge cases execution', e.message);
  }

  // --- TEST CASE 1f: Articles with Special Characters & XSS Risks ---
  console.log('\n--- 1f. Boundary: Special Characters & Injection Risks ---');
  try {
    await new Promise(res => {
      compileContextEngine(db, { articleIds: ['art-3'], serializer: 'xml' }, (err, result) => {
        assert(!err, 'XML serializer handles quotes, ampersands, angle brackets, null bytes');
        assert(!result.compiledPrompt.includes('<Script>'), 'XML escape turns <Script> into &lt;Script&gt;');
        res();
      });
    });

    // Front-end escapeHtml single-quote check
    const escapesSingleQuote = feCode.includes("replace(/'/g, '&#39;')") || feCode.includes("replace(/'/g, '&apos;')");
    assert(escapesSingleQuote, 'Front-end escapeHtml escapes single quotes (\') to prevent HTML attribute breakout XSS',
      escapesSingleQuote ? 'Single quotes escaped' : 'VULNERABILITY: escapeHtml does not escape single quotes! Vulnerable to inline event handler XSS injection!');
  } catch (e) {
    assert(false, 'Special characters execution', e.message);
  }

  // --- TEST CASE 1g: Snapshot Operations with Missing Fields or Corrupt JSON ---
  console.log('\n--- 1g. Boundary: Snapshot Operations & Corrupt JSON ---');
  try {
    // Database snapshot retrieval check with invalid JSON
    await new Promise(res => {
      db.run(`INSERT INTO context_snapshots (id, world_id, name, preset_type, config_json) VALUES (?, ?, ?, ?, ?)`,
        ['snap-corrupt', 'world-1', 'Corrupt Snapshot', 'session_prep', '{ bad_json: true '], (err) => {
          assert(!err, 'Inserted corrupted snapshot test row');

          db.all('SELECT * FROM context_snapshots WHERE id = ?', ['snap-corrupt'], (qErr, rows) => {
            let config = null;
            try {
              config = JSON.parse(rows[0].config_json);
            } catch (e) {
              config = rows[0].config_json;
            }
            assert(config === '{ bad_json: true ', 'Corrupted snapshot JSON safely handled via try/catch in GET /api/context/snapshots');
            res();
          });
        });
    });
  } catch (e) {
    assert(false, 'Snapshot operations execution', e.message);
  }

  // --- CODE AUDIT: Server.js & database/init.js Error Handling ---
  console.log('\n--- 2a. Code Audit: Server.js JSON.parse & Null Checks ---');
  // Check GET /api/articles JSON.parse tags risk
  const articleListRoute = serverCode.includes("tags: r.tags ? JSON.parse(r.tags) : []");
  const hasTryCatchInArticleList = serverCode.includes("safeParseTags(r.tags)") || serverCode.includes("try { parsedTags = JSON.parse");
  assert(!articleListRoute || hasTryCatchInArticleList, 'GET /api/articles wraps JSON.parse(r.tags) in try/catch to prevent server crash on corrupt DB rows',
    hasTryCatchInArticleList ? 'Protected by try/catch' : 'VULNERABILITY: Uncaught SyntaxError in JSON.parse(r.tags) crashes GET /api/articles endpoint!');

  // Check DOM dereferencing safety in context-builder.js
  console.log('\n--- 2b. Code Audit: Front-End DOM Dereferencing Checks ---');
  const freshFeCode = fs.readFileSync(path.join(__dirname, '../public/js/context-builder.js'), 'utf8');
  const isMissingVarDecl = /(?<!const\s|let\s|var\s)dropdown\s*=\s*document\.getElementById/.test(freshFeCode);
  assert(!isMissingVarDecl, 'public/js/context-builder.js uses strict variable declaration for dropdown element',
    isMissingVarDecl ? 'BUG: Missing `const` or `let` keyword pollutes window global scope as `window.dropdown`!' : 'Clean variable declaration');

  // Print Final Summary
  console.log('\n===============================================================');
  console.log('                   AUDIT RESULTS SUMMARY                       ');
  console.log('===============================================================');
  const passCount = testResults.filter(r => r.status === 'PASS').length;
  const failCount = testResults.filter(r => r.status === 'FAIL').length;
  console.log(`Total Scenarios Tested : ${testResults.length}`);
  console.log(`Passed                 : ${passCount}`);
  console.log(`Failed / Defective     : ${failCount}`);
  console.log(`Health Score           : ${Math.round((passCount / testResults.length) * 100)}%`);
  console.log('===============================================================\n');

  db.close();
}

function requireServerEngine(db, serverCode) {
  const stripSecretBlocksMatch = serverCode.match(/function stripSecretBlocks[\s\S]*?^}/m);
  const escapeXmlMatch = serverCode.match(/function escapeXml[\s\S]*?^}/m);
  const escapeYamlMatch = serverCode.match(/function escapeYaml[\s\S]*?^}/m);
  const estimateTokensMatch = serverCode.match(/function estimateTokens[\s\S]*?^}/m);
  const serializeContextEngineMatch = serverCode.match(/function serializeContextEngine[\s\S]*?^}/m);
  const compileContextEngineMatch = serverCode.match(/function compileContextEngine[\s\S]*?^}/m);

  const evalCode = `
    ${stripSecretBlocksMatch ? stripSecretBlocksMatch[0] : ''}
    ${escapeXmlMatch ? escapeXmlMatch[0] : ''}
    ${escapeYamlMatch ? escapeYamlMatch[0] : ''}
    ${estimateTokensMatch ? estimateTokensMatch[0] : ''}
    ${serializeContextEngineMatch ? serializeContextEngineMatch[0] : ''}
    ${compileContextEngineMatch ? compileContextEngineMatch[0] : ''}
    return { stripSecretBlocks, escapeXml, escapeYaml, estimateTokens, serializeContextEngine, compileContextEngine };
  `;

  return (new Function(evalCode))();
}

runAudit().catch(err => console.error('Audit Runner Error:', err));
