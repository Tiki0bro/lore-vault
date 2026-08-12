const http = require('http');
const { spawn } = require('child_process');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { initDb } = require('../database/init');

const PORT = 3999;
const BASE_URL = `http://localhost:${PORT}`;

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json'
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
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('--- STARTING LLM CONTEXT BUILDER TESTS ---');

  // 1. Verify initDb creates tables cleanly
  console.log('\n[1] Testing database/init.js schema initialization...');
  const dbPath = path.join(__dirname, '..', 'database', 'lore.db');
  const testDb = new sqlite3.Database(dbPath);
  await initDb(testDb);
  console.log('✓ database/init.js initialized context_snapshots successfully.');

  // Seed test data in lore.db
  await new Promise((resolve, reject) => {
    testDb.serialize(() => {
      testDb.run(`INSERT OR REPLACE INTO articles (id, title, category, summary, content, tags, world_id) VALUES
        ('test-art-1', 'Elven Sanctuary', 'Locations', 'Sacred forest grove.', 'The sanctuary of @[Aethelgard](template:test-art-2). [box=secret]The ancient altar lies beneath.[/box] Hidden truth.', 'elf, magic', 'default'),
        ('test-art-2', 'Aethelgard', 'Characters', 'High Priest of the Sanctuary.', 'Aethelgard protects the elder secrets.', 'hero', 'default'),
        ('test-art-3', 'Shadow Vault', 'Secrets', 'Forbidden dark vault.', 'Contains dangerous dark magic.', '#dm-secret', 'default')
      `);

      testDb.run(`INSERT OR REPLACE INTO personas (id, article_id, thoughts, wants, needs) VALUES
        ('p-2', 'test-art-2', 'Must protect the forest', 'Peace and harmony', 'Elder crystal energy')
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
  testDb.close();
  console.log('✓ Seeded test articles and persona record.');

  // 2. Spawn server process on port 3999
  console.log(`\n[2] Starting server on port ${PORT}...`);
  const env = Object.assign({}, process.env, { PORT: PORT.toString() });
  const serverProcess = spawn('node', ['server.js'], { cwd: path.join(__dirname, '..'), env });

  serverProcess.stdout.on('data', (d) => {
    // optional logging
  });
  serverProcess.stderr.on('data', (d) => {
    // console.error('Server err:', d.toString());
  });

  // Give server time to boot
  await wait(1500);

  try {
    // 3. Test POST /api/context/compile with full ContextConfig payload
    console.log('\n[3] Testing POST /api/context/compile (Markdown, includeSecrets=false, maxGraphHops=1)...');
    const configPayload = {
      presetId: 'session_prep',
      serializer: 'markdown',
      includeSecrets: false,
      includePersonas: true,
      buckets: {
        system: {
          instructions: 'Focus on narrative atmosphere.',
          toneChips: ['Mystical', 'Eerie'],
          formatGuidance: 'Use clear headings.'
        },
        world: {
          maxGraphHops: 1
        },
        slate: {
          articleIds: ['test-art-1'],
          includePersonas: true
        },
        workingState: {
          chapterBeats: 'The heroes reach the boundary wall.',
          userPrompt: 'Describe their arrival at the grove.'
        }
      }
    };

    const compileRes = await makeRequest('POST', '/api/context/compile', configPayload);
    console.log('Compile Response status:', compileRes.status);
    console.log('Token Stats:', compileRes.body.tokenStats);
    console.log('Sources:', compileRes.body.sources);

    if (compileRes.status !== 200) throw new Error('Compile failed with status ' + compileRes.status);
    if (!compileRes.body.compiledPrompt) throw new Error('compiledPrompt missing from response');
    if (compileRes.body.compiledPrompt.includes('[box=secret]')) throw new Error('Secret box block was NOT stripped!');
    if (!compileRes.body.sources.some(s => s.id === 'test-art-2' && s.hop === 1)) throw new Error('Hop 1 cross-linked article missing from sources!');
    console.log('✓ POST /api/context/compile passed!');

    // 4. Test Serializers (XML, JSON, YAML)
    console.log('\n[4] Testing Serializers (XML, JSON, YAML)...');
    for (const fmt of ['xml', 'json', 'yaml']) {
      const sRes = await makeRequest('POST', '/api/context/compile', { ...configPayload, serializer: fmt });
      if (sRes.status !== 200) throw new Error(`Serializer ${fmt} failed with status ${sRes.status}`);
      if (!sRes.body.compiledPrompt) throw new Error(`Serializer ${fmt} prompt missing`);
      console.log(`✓ Serializer '${fmt}' returned valid prompt (${sRes.body.tokenStats.totalTokens} tokens).`);
    }

    // 5. Test POST /api/context/preview
    console.log('\n[5] Testing POST /api/context/preview...');
    const previewRes = await makeRequest('POST', '/api/context/preview', configPayload);
    if (previewRes.status !== 200 || !previewRes.body.compiledPrompt) throw new Error('Preview endpoint failed');
    console.log('✓ POST /api/context/preview passed!');

    // 6. Test Snapshot CRUD routes
    console.log('\n[6] Testing Snapshot CRUD routes...');
    const newSnapshot = {
      id: 'snap-test-101',
      world_id: 'default',
      name: 'Session Prep Alpha',
      preset_type: 'session_prep',
      config: configPayload
    };

    // Create
    const createRes = await makeRequest('POST', '/api/context/snapshots', newSnapshot);
    if (createRes.status !== 200 || !createRes.body.success) throw new Error('Failed to save snapshot');
    console.log('✓ POST /api/context/snapshots passed!');

    // Get
    const getRes = await makeRequest('GET', '/api/context/snapshots?world_id=default');
    if (getRes.status !== 200 || !Array.isArray(getRes.body)) throw new Error('Failed to fetch snapshots');
    const fetchedSnap = getRes.body.find(s => s.id === 'snap-test-101');
    if (!fetchedSnap || fetchedSnap.name !== 'Session Prep Alpha') throw new Error('Created snapshot not found in list');
    console.log('✓ GET /api/context/snapshots passed!');

    // Delete
    const delRes = await makeRequest('DELETE', `/api/context/snapshots/${newSnapshot.id}`);
    if (delRes.status !== 200 || !delRes.body.success) throw new Error('Failed to delete snapshot');
    console.log('✓ DELETE /api/context/snapshots/:id passed!');

    console.log('\n========================================');
    console.log('ALL LLM CONTEXT BUILDER TESTS PASSED SUCCESSFULLY!');
    console.log('========================================\n');

  } catch (err) {
    console.error('\n❌ TEST ERROR:', err.message);
    process.exitCode = 1;
  } finally {
    serverProcess.kill();
  }
}

runTests();
