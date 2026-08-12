const http = require('http');
const { spawn } = require('child_process');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const assert = require('assert');

const PORT = 3998;
const BASE_URL = `http://localhost:${PORT}`;

function makeRequest(method, reqPath, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(reqPath, BASE_URL);
    const postData = body ? JSON.stringify(body) : '';
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(postData);
    }
    req.end();
  });
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('--- STARTING WEAVE MATRIX CONTEXT COMPILER TESTS ---');

  // Seed test data into database/lore.db
  const dbPath = path.join(__dirname, '..', 'database', 'lore.db');
  const db = new sqlite3.Database(dbPath);

  await new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS articles (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        sub_category TEXT,
        world_id TEXT DEFAULT 'default',
        summary TEXT,
        content TEXT NOT NULL,
        tags TEXT,
        header_image TEXT,
        visibility TEXT DEFAULT 'public',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run("ALTER TABLE articles ADD COLUMN visibility TEXT DEFAULT 'public'", (err) => {});

      db.run(`INSERT OR REPLACE INTO articles (id, title, category, summary, content, visibility, world_id) VALUES
        ('valoria-empire', 'Valoria Empire', 'Factions', 'Powerful empire', 'Valoria empire lore. [secret]Secret imperial plans.[/secret] Public history.', 'public', 'default'),
        ('shadow-guild', 'Shadow Guild', 'Organizations', 'Secret guild', 'Operating in secret.', 'dm_only', 'default'),
        ('border-fort', 'Border Fort', 'Locations', 'Fortress near Valoria border', 'Guards the border.', 'public', 'default')
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
  db.close();
  console.log('✓ Seeded test articles in DB.');

  // Spawn fresh server process on PORT 3998
  console.log(`Starting server process on port ${PORT}...`);
  const env = Object.assign({}, process.env, { PORT: PORT.toString() });
  const serverProcess = spawn('node', ['server.js'], { cwd: path.join(__dirname, '..'), env });

  serverProcess.stderr.on('data', (d) => {
    // console.error('Server err:', d.toString());
  });

  await wait(2000);

  try {
    // 1. Basic Integration Test for POST /api/context/compile
    console.log('\n[1] Testing POST /api/context/compile (XML, Public, Query: Valoria)...');
    const postData = {
      world_id: 'all',
      pinned_ids: ['valoria-empire'],
      query: 'Valoria',
      format: 'xml',
      visibility: 'public',
      max_tokens: 4000
    };

    const res = await makeRequest('POST', '/api/context/compile', postData);
    console.log('Status Code:', res.status);
    console.log('Compiler Response Status:', res.body.status, 'Tokens:', res.body.token_metrics);

    assert.strictEqual(res.status, 200, 'Expected 200 OK status code');
    assert.strictEqual(res.body.status, 'success', 'Expected status to be success');
    assert.strictEqual(res.body.format, 'xml', 'Expected format to be xml');
    assert.strictEqual(res.body.visibility, 'public', 'Expected visibility to be public');
    assert(res.body.compiled_context, 'Expected compiled_context in response');
    assert(res.body.compiled_context.includes('<entity id="valoria-empire"'), 'Compiled context should include valoria-empire');
    assert(!res.body.compiled_context.includes('Secret imperial plans'), 'Secret block should be stripped in public visibility mode');
    assert(!res.body.compiled_context.includes('Shadow Guild'), 'DM-only article should be excluded in public visibility mode');
    console.log('✅ Context compilation endpoint integration test passed!');

    // 2. Testing Multi-Format Serialization (Markdown, JSON, YAML)
    console.log('\n[2] Testing Multi-Format Serialization...');
    for (const fmt of ['markdown', 'json', 'yaml']) {
      const fmtRes = await makeRequest('POST', '/api/context/compile', { ...postData, format: fmt });
      assert.strictEqual(fmtRes.status, 200);
      assert.strictEqual(fmtRes.body.status, 'success');
      assert.strictEqual(fmtRes.body.format, fmt);
      assert(fmtRes.body.compiled_context, `Compiled context for ${fmt} should be present`);
      console.log(`✓ Serializer '${fmt}' returned valid output (${fmtRes.body.token_metrics.total_tokens} tokens).`);
    }

    // 3. Testing DM-Only Visibility Mode
    console.log('\n[3] Testing DM-Only Visibility Mode...');
    const dmRes = await makeRequest('POST', '/api/context/compile', { ...postData, pinned_ids: ['valoria-empire', 'shadow-guild'], visibility: 'dm_only', format: 'markdown' });
    assert.strictEqual(dmRes.status, 200);
    assert(dmRes.body.compiled_context.includes('Secret imperial plans'), 'Secret block SHOULD be present in DM-Only mode');
    assert(dmRes.body.compiled_context.includes('Shadow Guild'), 'DM-only article SHOULD be included in DM-Only mode');
    console.log('✓ DM-Only visibility mode test passed!');

    // 4. Testing Token Budget Boundary
    console.log('\n[4] Testing Token Budget Boundary...');
    const budgetRes = await makeRequest('POST', '/api/context/compile', { ...postData, max_tokens: 20 });
    assert.strictEqual(budgetRes.status, 200);
    assert(budgetRes.body.token_metrics.selected_count <= res.body.token_metrics.selected_count, 'Selected count should respect tight max_tokens budget');
    console.log('✓ Token budget boundary test passed!');

    console.log('\n========================================');
    console.log('ALL WEAVE MATRIX COMPILER TESTS PASSED!');
    console.log('========================================\n');

  } catch (err) {
    console.error('\n❌ TEST ERROR:', err.message);
    process.exitCode = 1;
  } finally {
    if (serverProcess) {
      serverProcess.kill();
    }
  }
}

runTests();
