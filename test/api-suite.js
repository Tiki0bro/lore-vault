const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

let serverProcess = null;
const PORT = 3099;

function makeRequest(reqPath, options = {}, postData = null) {
  return new Promise((resolve, reject) => {
    const reqOpts = {
      hostname: 'localhost',
      port: PORT,
      path: reqPath,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    if (postData && !reqOpts.headers['Content-Type']) {
      reqOpts.headers['Content-Type'] = 'application/json';
    }

    const req = http.request(reqOpts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) {}
        resolve({ statusCode: res.statusCode, headers: res.headers, raw: data, json });
      });
    });

    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

const { app } = require('../server.js');

test.before((_, done) => {
  serverProcess = app.listen(PORT, () => {
    done();
  });
});

test.after((_, done) => {
  if (serverProcess && serverProcess.listening) {
    serverProcess.close(done);
  } else {
    done();
  }
});

test('GET /api/worlds returns world list', async () => {
  const res = await makeRequest('/api/worlds');
  assert.strictEqual(res.statusCode, 200);
  assert.ok(Array.isArray(res.json.worlds) || Array.isArray(res.json));
});

test('GET /api/articles returns articles list', async () => {
  const res = await makeRequest('/api/articles');
  assert.strictEqual(res.statusCode, 200);
  assert.ok(Array.isArray(res.json.articles) || Array.isArray(res.json));
});

test('POST /api/articles creates a new article with dual-sync', async () => {
  const uniqueTitle = 'Test Hardening Article ' + Date.now();
  const newArticle = {
    title: uniqueTitle,
    category: 'History',
    content: 'This is a test article created by the automated API test suite.',
    tags: ['test', 'hardening'],
    world_id: 'default'
  };

  const res = await makeRequest('/api/articles', { method: 'POST' }, newArticle);
  assert.strictEqual(res.statusCode, 201);
  assert.ok(res.json.id);

  const getRes = await makeRequest(`/api/articles/${res.json.id}`);
  assert.strictEqual(getRes.statusCode, 200);
  assert.strictEqual(getRes.json.title, uniqueTitle);
});

test('GET /api/categories returns category counts', async () => {
  const res = await makeRequest('/api/categories');
  assert.strictEqual(res.statusCode, 200);
  assert.ok(Array.isArray(res.json));
});

test('GET /api/worlds/:worldId/relationships returns relationship matrix', async () => {
  const res = await makeRequest('/api/worlds/default/relationships');
  assert.strictEqual(res.statusCode, 200);
  assert.ok(Array.isArray(res.json.relationships));
});

test('GET /api/worlds/:worldId/timeline returns timeline events', async () => {
  const res = await makeRequest('/api/worlds/default/timeline');
  assert.strictEqual(res.statusCode, 200);
  assert.ok(Array.isArray(res.json.events) || Array.isArray(res.json));
});

test('GET /api/worlds/:worldId/maps returns maps list', async () => {
  const res = await makeRequest('/api/worlds/default/maps');
  assert.strictEqual(res.statusCode, 200);
  assert.ok(Array.isArray(res.json.maps) || Array.isArray(res.json));
});

test('POST /api/export/world-bundle/:worldId exports offline world bundle', async () => {
  const res = await makeRequest('/api/export/world-bundle/default', { method: 'POST' });
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.json.success, true);
  assert.ok(res.json.bundle);
  assert.ok(Array.isArray(res.json.bundle.articles));
});

test('POST /api/ai/assist enforces no_generate_mode 403 guardrail', async () => {
  const payload = {
    action: 'expand_lore',
    title: 'Test Article',
    content: 'Lore content...',
    no_generate_mode: true
  };
  const res = await makeRequest('/api/ai/assist', { method: 'POST' }, payload);
  assert.strictEqual(res.statusCode, 403);
  assert.strictEqual(res.json.code, 'ERR_NO_GENERATE_MODE');
});

test('GET /api/audit/run returns multi-factor canon diagnostics', async () => {
  const res = await makeRequest('/api/audit/run?world_id=default');
  assert.strictEqual(res.statusCode, 200);
  assert.ok(typeof res.json.healthScore === 'number');
  assert.ok(Array.isArray(res.json.deadCrossLinks));
  assert.ok(Array.isArray(res.json.circularRelations));
});

test('POST /api/audit/flesh-out-stub respects no_generate_mode', async () => {
  const res = await makeRequest('/api/audit/flesh-out-stub', { method: 'POST' }, {
    stubId: 'art-1',
    title: 'Test Stub Article',
    category: 'Locations',
    no_generate_mode: true
  });
  assert.strictEqual(res.statusCode, 200);
  assert.ok(res.json.content);
  assert.ok(res.json.content.includes('[h1]Test Stub Article[/h1]'));
  assert.ok(res.json.content.includes('[b]Category:[/b]'));
});

test('POST /api/audit/batch-repair performs multi-action batch fixes', async () => {
  const res = await makeRequest('/api/audit/batch-repair', { method: 'POST' }, {
    world_id: 'default',
    actions: ['fix_misclassified']
  });
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.json.success, true);
  assert.ok(typeof res.json.processedCount === 'number');
});

test('GET /api/audit/export-report generates markdown health report', async () => {
  const res = await makeRequest('/api/audit/export-report?world_id=default');
  assert.strictEqual(res.statusCode, 200);
  assert.ok(res.json.markdownContent);
  assert.ok(res.json.markdownContent.includes('# 🏥 World Health & Canon Diagnostic Report'));
});

test('POST /api/audit/dismiss toggles issue suppression', async () => {
  const dismissRes = await makeRequest('/api/audit/dismiss', { method: 'POST' }, { issue_key: 'stub:test-123' });
  assert.strictEqual(dismissRes.statusCode, 200);
  assert.strictEqual(dismissRes.json.success, true);
  assert.strictEqual(dismissRes.json.isIgnored, true);

  const ignoredRes = await makeRequest('/api/audit/ignored');
  assert.strictEqual(ignoredRes.statusCode, 200);
  assert.ok(Array.isArray(ignoredRes.json.ignoredKeys));
  assert.ok(ignoredRes.json.ignoredKeys.includes('stub:test-123'));

  const restoreRes = await makeRequest('/api/audit/dismiss', { method: 'POST' }, { issue_key: 'stub:test-123' });
  assert.strictEqual(restoreRes.statusCode, 200);
  assert.strictEqual(restoreRes.json.isIgnored, false);
});

// --- TTRPG STAT BLOCK INTEGRATION TESTS ---

test('POST & GET /api/articles/:id/statblock handles CRUD and Player Secret filtering', async () => {
  // 1. Create Article
  const artTitle = `Ancient Red Dragon ${Date.now()}`;
  const artRes = await makeRequest('/api/articles', { method: 'POST' }, {
    title: artTitle,
    category: 'Races & Species',
    content: '[h1]Ancient Red Dragon[/h1]\nA terrifying fire-breathing wyrm.',
    world_id: 'default'
  });
  assert.ok([200, 201].includes(artRes.statusCode));
  const testArtId = artRes.json.id;
  assert.ok(testArtId);

  // 2. Create Public Stat Block
  const createRes = await makeRequest(`/api/articles/${testArtId}/statblock`, { method: 'POST' }, {
    system: 'dnd5e',
    type: 'character',
    name: 'Ancient Red Dragon',
    stats_json: { cr: '17', ac: 19, hp: 256, abilities: { str: 27, dex: 10, con: 25, int: 16, wis: 13, cha: 21 } },
    is_secret: 0
  });
  assert.strictEqual(createRes.statusCode, 200);
  assert.strictEqual(createRes.json.status, 'success');
  const publicBlockId = createRes.json.data.id;
  assert.ok(publicBlockId);

  // 3. Create Secret Stat Block (DM Only)
  const secretRes = await makeRequest(`/api/articles/${testArtId}/statblock`, { method: 'POST' }, {
    system: 'dnd5e',
    type: 'character',
    name: 'Dragon True Vulnerability Note',
    stats_json: { cr: '17', secret_weakness: 'Cold Iron Arrow to Left Eye' },
    is_secret: 1
  });
  assert.strictEqual(secretRes.statusCode, 200);
  const secretBlockId = secretRes.json.data.id;

  // 4. Fetch DM Mode Stat Blocks (returns both)
  const dmFetch = await makeRequest(`/api/articles/${testArtId}/statblock`);
  assert.strictEqual(dmFetch.statusCode, 200);
  assert.strictEqual(dmFetch.json.data.length, 2);

  // 5. Fetch Article Details & verify bundled statblocks payload
  const artDetails = await makeRequest(`/api/articles/${testArtId}`);
  assert.strictEqual(artDetails.statusCode, 200);
  assert.ok(Array.isArray(artDetails.json.statblocks));
  assert.strictEqual(artDetails.json.statblocks.length, 2);

  // 6. Test Foundry VTT Exporter Endpoint
  const foundryExp = await makeRequest(`/api/statblocks/${publicBlockId}/export/foundry`);
  assert.strictEqual(foundryExp.statusCode, 200);
  assert.strictEqual(foundryExp.json.name, 'Ancient Red Dragon');
  assert.strictEqual(foundryExp.json.type, 'npc');
  assert.ok(foundryExp.json.system.attributes);

  // 7. Test Bestiary Endpoint
  const bestiaryRes = await makeRequest('/api/worlds/default/bestiary?system=dnd5e');
  assert.strictEqual(bestiaryRes.statusCode, 200);
  assert.strictEqual(bestiaryRes.json.status, 'success');
  assert.ok(Array.isArray(bestiaryRes.json.data));

  // 8. Fetch Player Mode Stat Blocks (strips is_secret = 1)
  const playerFetch = await makeRequest(`/api/articles/${testArtId}/statblock?mode=player`);
  assert.strictEqual(playerFetch.statusCode, 200);
  assert.strictEqual(playerFetch.json.data.length, 1);
  assert.strictEqual(playerFetch.json.data[0].id, publicBlockId);

  // 9. Test AI Conversion Endpoint
  const aiRes = await makeRequest('/api/statblocks/convert-ai', { method: 'POST' }, {
    article_id: testArtId,
    system: 'pf2e',
    type: 'weapon'
  });
  assert.strictEqual(aiRes.statusCode, 200);
  assert.strictEqual(aiRes.json.status, 'success');
  assert.ok(aiRes.json.data.id);

  // 10. Delete Stat Blocks & Article Clean up
  await makeRequest(`/api/statblocks/${publicBlockId}`, { method: 'DELETE' });
  await makeRequest(`/api/statblocks/${secretBlockId}`, { method: 'DELETE' });
  await makeRequest(`/api/statblocks/${aiRes.json.data.id}`, { method: 'DELETE' });
  await makeRequest(`/api/articles/${testArtId}`, { method: 'DELETE' });
});

// --- AI WELCOME CONCIERGE INTEGRATION TESTS ---

test('POST /api/concierge/route-intent handles fallback & classification routing', async () => {
  // 1. Empty Intent Test
  const emptyRes = await makeRequest('/api/concierge/route-intent', { method: 'POST' }, {
    world_id: 'default',
    user_intent: ''
  });
  assert.strictEqual(emptyRes.statusCode, 200);
  assert.strictEqual(emptyRes.json.success, true);
  assert.strictEqual(emptyRes.json.routing.target_view, 'frontpage');

  // 2. Writer Intent Test
  const writerRes = await makeRequest('/api/concierge/route-intent', { method: 'POST' }, {
    world_id: 'default',
    user_intent: 'I want to write chapter 3 of the novel'
  });
  assert.strictEqual(writerRes.statusCode, 200);
  assert.strictEqual(writerRes.json.success, true);
  assert.strictEqual(writerRes.json.routing.target_view, 'reader');
  assert.strictEqual(writerRes.json.routing.enable_zen_mode, true);
  assert.strictEqual(writerRes.json.routing.open_drawer, 'weave-matrix');

  // 3. Atlas / Map Intent Test
  const mapRes = await makeRequest('/api/concierge/route-intent', { method: 'POST' }, {
    world_id: 'default',
    user_intent: 'Explore world map geography and cartography pins'
  });
  assert.strictEqual(mapRes.statusCode, 200);
  assert.strictEqual(mapRes.json.success, true);
  assert.strictEqual(mapRes.json.routing.target_view, 'atlas');

  // 4. Stat Block / DM Prep Intent Test
  const dmRes = await makeRequest('/api/concierge/route-intent', { method: 'POST' }, {
    world_id: 'default',
    user_intent: 'Prep monster stat blocks for DND 5e boss fight'
  });
  assert.strictEqual(dmRes.statusCode, 200);
  assert.strictEqual(dmRes.json.success, true);
  assert.strictEqual(dmRes.json.routing.target_view, 'reader');
  assert.strictEqual(dmRes.json.routing.open_drawer, 'statblock');

  // 5. World Doctor Audit Intent Test
  const auditRes = await makeRequest('/api/concierge/route-intent', { method: 'POST' }, {
    world_id: 'default',
    user_intent: 'Audit orphaned stubs and canon consistency'
  });
  assert.strictEqual(auditRes.statusCode, 200);
  assert.strictEqual(auditRes.json.success, true);
  assert.strictEqual(auditRes.json.routing.open_drawer, 'doctor');
});

// --- AI CONFIG & CONNECTION TEST INTEGRATION TESTS ---

test('GET & POST /api/ai/config manages dual-tier AI settings', async () => {
  const getRes = await makeRequest('/api/ai/config');
  assert.strictEqual(getRes.statusCode, 200);
  assert.strictEqual(getRes.json.success, true);
  assert.ok('use_custom_provider' in getRes.json);

  const postRes = await makeRequest('/api/ai/config', { method: 'POST' }, {
    use_custom_provider: true,
    custom_provider: 'gemini',
    custom_api_key: 'AIzaSyTestKey12345',
    custom_model: 'gemini-2.0-flash'
  });
  assert.strictEqual(postRes.statusCode, 200);
  assert.strictEqual(postRes.json.success, true);
  assert.strictEqual(postRes.json.config.use_custom_provider, true);
  assert.strictEqual(postRes.json.config.masked_key, '••••••••2345');

  // Verify fetching returns updated masked config
  const updatedGet = await makeRequest('/api/ai/config');
  assert.strictEqual(updatedGet.statusCode, 200);
  assert.strictEqual(updatedGet.json.use_custom_provider, true);
  assert.strictEqual(updatedGet.json.masked_key, '••••••••2345');

  // Reset back to default use_custom_provider: false
  const resetRes = await makeRequest('/api/ai/config', { method: 'POST' }, {
    use_custom_provider: false
  });
  assert.strictEqual(resetRes.statusCode, 200);
  assert.strictEqual(resetRes.json.config.use_custom_provider, false);
});

test('POST /api/ai/test-connection verifies provider readiness', async () => {
  const testRes = await makeRequest('/api/ai/test-connection', { method: 'POST' }, {
    provider: 'gemini',
    api_key: '',
    use_custom_provider: false
  });
  assert.strictEqual(testRes.statusCode, 200);
  assert.strictEqual(testRes.json.success, true);
  assert.ok(typeof testRes.json.latency_ms === 'number');
  assert.ok(testRes.json.message);
});

test('POST /api/ai/test-connection handles unreachable ollama instance gracefully', async () => {
  const ollamaRes = await makeRequest('/api/ai/test-connection', { method: 'POST' }, {
    use_custom_provider: true,
    provider: 'ollama',
    ollama_url: 'http://127.0.0.1:59999'
  });
  assert.strictEqual(ollamaRes.statusCode, 200);
  assert.strictEqual(ollamaRes.json.success, false);
  assert.ok(typeof ollamaRes.json.latency_ms === 'number');
  assert.ok(ollamaRes.json.message.includes('Ollama'));
});
