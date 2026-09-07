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
});

test('GET, POST & DELETE /api/skills manages custom AI rules & directives', async () => {
  const createRes = await makeRequest('/api/skills', { method: 'POST' }, {
    name: 'Grimdark Prose Directive',
    description: 'Enforce gritty combat descriptions',
    directives: '• Write in visceral, high-stakes tone\n• Avoid modern slang',
    is_active: 1
  });
  assert.strictEqual(createRes.statusCode, 200);
  assert.strictEqual(createRes.json.success, true);
  const skillId = createRes.json.id;

  const listRes = await makeRequest('/api/skills?world_id=all');
  assert.strictEqual(listRes.statusCode, 200);
  assert.ok(Array.isArray(listRes.json));
  assert.ok(listRes.json.some(s => s.id === skillId));

  const delRes = await makeRequest(`/api/skills/${skillId}`, { method: 'DELETE' });
  assert.strictEqual(delRes.statusCode, 200);
  assert.strictEqual(delRes.json.success, true);
});

test('POST /api/skills/generate drafts system directives with AI', async () => {
  const res = await makeRequest('/api/skills/generate', { method: 'POST' }, { prompt: 'Make AI write high-fantasy dialogue' });
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.json.success, true);
  assert.ok(res.json.skill.name);
  assert.ok(res.json.skill.directives);
});

test('GET /api/search/fts performs full-text search with snippets', async () => {
  const res = await makeRequest('/api/search/fts?q=default&world_id=all');
  assert.strictEqual(res.statusCode, 200);
  assert.ok(Array.isArray(res.json.results));
});

test('POST /api/simulation/npc-dialogue roleplays NPC in character', async () => {
  const uniqueTitle = 'Lord Malakor Test NPC ' + Date.now();
  const artRes = await makeRequest('/api/articles', { method: 'POST' }, {
    title: uniqueTitle,
    category: 'Characters',
    sub_category: 'Villain',
    content: 'A ruthless warlord commanding shadow armies.',
    world_id: 'default'
  });
  const npcId = artRes.json.id || artRes.json.article_id || (artRes.json.article && artRes.json.article.id);

  const res = await makeRequest('/api/simulation/npc-dialogue', { method: 'POST' }, {
    character_id: npcId,
    user_message: 'Why do you attack our lands?'
  });
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.json.characterId, npcId);
  assert.ok(res.json.reply);
  assert.ok(res.json.emotion);
});

test('GET /api/census/stats computes world demographic statistics', async () => {
  const res = await makeRequest('/api/census/stats?world_id=all');
  assert.strictEqual(res.statusCode, 200);
  assert.ok(typeof res.json.totalArticles === 'number');
  assert.ok(typeof res.json.totalWords === 'number');
  assert.ok(Array.isArray(res.json.categoryBreakdown));
});

test('POST /api/simulation/generate-rumors drafts in-universe broadsheet & d100 rumor table', async () => {
  const res = await makeRequest('/api/simulation/generate-rumors', { method: 'POST' }, { world_id: 'all', count: 4 });
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.json.success, true);
  assert.ok(res.json.broadsheet.headline);
  assert.ok(Array.isArray(res.json.broadsheet.rumors));
});

test('POST /api/maps/generate-settlement builds procedural grid floorplan layout', async () => {
  const res = await makeRequest('/api/maps/generate-settlement', { method: 'POST' }, { name: 'Ironclad Vault', map_type: 'dungeon', grid_size: 10 });
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.json.success, true);
  assert.strictEqual(res.json.settlement.name, 'Ironclad Vault');
  assert.ok(Array.isArray(res.json.settlement.rooms));
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

// --- VTT INTEGRATION SUITE TEST SUITE ---

test('GET /api/vtt/foundry/journals/:articleId returns valid Foundry Journal JSON', async () => {
  const artRes = await makeRequest('/api/articles', { method: 'POST' }, {
    title: 'VTT Test Article ' + Date.now(),
    category: 'History',
    content: 'Lore text with [secret]Hidden Cultist HQ[/secret] details.'
  });
  assert.strictEqual(artRes.statusCode, 201);
  const articleId = artRes.json.id;

  const res = await makeRequest(`/api/vtt/foundry/journals/${articleId}?mode=player`);
  assert.strictEqual(res.statusCode, 200);
  assert.ok(res.json.name);
  assert.ok(Array.isArray(res.json.pages));
  assert.strictEqual(res.json.pages[0].type, 'text');
  assert.strictEqual(res.json.pages[0].text.content.includes('Hidden Cultist HQ'), false);
});

test('GET /api/vtt/foundry/scenes/:mapId returns valid Foundry Scene JSON', async () => {
  const mapsRes = await makeRequest('/api/worlds/main/maps');
  const mapId = (mapsRes.json && mapsRes.json.maps && mapsRes.json.maps.length > 0) ? mapsRes.json.maps[0].id : 1;
  const res = await makeRequest(`/api/vtt/foundry/scenes/${mapId}?mode=player`);
  assert.strictEqual(res.statusCode, 200);
  assert.ok(res.json.name);
  assert.ok(typeof res.json.width === 'number');
  assert.ok(Array.isArray(res.json.notes));
});

test('POST /api/vtt/export/roll20 exports formatted Handouts', async () => {
  const artRes = await makeRequest('/api/articles', { method: 'POST' }, {
    title: 'VTT Roll20 Test Article ' + Date.now(),
    category: 'Lore',
    content: 'Roll20 lore content'
  });
  const articleId = artRes.json.id;

  const res = await makeRequest('/api/vtt/export/roll20', { method: 'POST' }, {
    article_ids: [articleId],
    mode: 'player'
  });
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.json.success, true);
  assert.ok(Array.isArray(res.json.r20_handouts));
  assert.ok(res.json.r20_handouts.length > 0);
});


test('POST /api/vtt/export/fgu generates clean Fantasy Grounds XML document', async () => {
  const res = await makeRequest('/api/vtt/export/fgu', { method: 'POST' }, {
    world_id: 'main',
    mode: 'player'
  });
  assert.strictEqual(res.statusCode, 200);
  assert.ok(res.raw.includes('<?xml version="1.0"'));
  assert.ok(res.raw.includes('<root version="4.1">'));
});

test('POST /api/vtt/validate-schema sanitizes DM secret blocks in player mode', async () => {
  const res = await makeRequest('/api/vtt/validate-schema', { method: 'POST' }, {
    target_vtt: 'foundry',
    mode: 'player',
    payload: {
      name: 'Test Document',
      secret_notes: '[secret]Hidden Cultist HQ[/secret] Regular town lore'
    }
  });
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.json.valid, true);
  assert.strictEqual(res.json.sanitized_payload.secret_notes.includes('Hidden Cultist HQ'), false);
  assert.ok(res.json.sanitized_payload.secret_notes.includes('Regular town lore'));
});

// --- VISUAL LORE CANVAS & SPATIAL MINDMAP TESTS ---

test('GET & POST /api/worlds/:worldId/canvas-nodes and /api/canvas/positions', async () => {
  const nodesGet = await makeRequest('/api/worlds/default/canvas-nodes');
  assert.strictEqual(nodesGet.statusCode, 200);
  assert.strictEqual(nodesGet.json.world_id, 'default');
  assert.ok(Array.isArray(nodesGet.json.nodes));
  assert.ok(Array.isArray(nodesGet.json.edges));

  const posPost = await makeRequest('/api/canvas/positions', { method: 'POST' }, {
    world_id: 'default',
    positions: [
      { entity_type: 'article', entity_id: 'art-1', pos_x: 0.45, pos_y: 0.60, pinned: 1 }
    ]
  });
  assert.strictEqual(posPost.statusCode, 200);
  assert.strictEqual(posPost.json.success, true);
  assert.strictEqual(posPost.json.count, 1);

  const autoLayout = await makeRequest('/api/canvas/auto-layout', { method: 'POST' }, {
    world_id: 'default',
    algorithm: 'circle'
  });
  assert.strictEqual(autoLayout.statusCode, 200);
  assert.strictEqual(autoLayout.json.success, true);
  assert.strictEqual(autoLayout.json.algorithm, 'circle');
});

// --- AI WORLD SIMULATOR & CAUSALITY ENGINE TESTS ---

test('POST /api/simulation/simulate-era, causality-audit, and rumors', async () => {
  const simRes = await makeRequest('/api/simulation/simulate-era', { method: 'POST' }, {
    world_id: 'default',
    timespan_years: 50,
    custom_catalyst: 'Great Drought'
  });
  assert.strictEqual(simRes.statusCode, 200);
  assert.strictEqual(simRes.json.timespan_years, 50);
  assert.ok(simRes.json.summary);
  assert.ok(Array.isArray(simRes.json.generated_events));

  const auditRes = await makeRequest('/api/simulation/causality-audit', { method: 'POST' }, {
    world_id: 'default'
  });
  assert.strictEqual(auditRes.statusCode, 200);
  assert.ok(typeof auditRes.json.overall_causality_score === 'number');
  assert.ok(Array.isArray(auditRes.json.socratic_probes));

  const rumorRes = await makeRequest('/api/simulation/rumors/default');
  assert.strictEqual(rumorRes.statusCode, 200);
  assert.ok(Array.isArray(rumorRes.json.rumors));
  assert.strictEqual(rumorRes.json.rumors.length, 5);
});

// --- DM SECRETS & CANON AUDIT TESTS ---

test('POST /api/audit/scan-secrets scans world articles for secrets', async () => {
  const res = await makeRequest('/api/audit/scan-secrets', { method: 'POST' }, {
    world_id: 'default'
  });
  assert.strictEqual(res.statusCode, 200);
  assert.ok(typeof res.json.total_secrets_found === 'number');
  assert.ok(Array.isArray(res.json.articles_with_secrets));
});

// --- AI FIGHT SIMULATOR TESTS ---

test('POST /api/ai/simulate-fight simulates turn-based dice battle', async () => {
  const res = await makeRequest('/api/ai/simulate-fight', { method: 'POST' }, {
    combatant_a: { name: 'Sir Cedric', hp: 30, ac: 16, attack_bonus: 5, damage_dice: '1d8+3' },
    combatant_b: { name: 'Orc Berserker', hp: 28, ac: 13, attack_bonus: 4, damage_dice: '2d6+2' },
    environment: 'Castle Courtyard',
    generate_prose: false
  });

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.json.success, true);
  assert.ok(res.json.winner);
  assert.ok(typeof res.json.total_rounds === 'number');
  assert.ok(Array.isArray(res.json.turn_log));
  assert.ok(res.json.turn_log.length > 0);
  assert.ok(res.json.mechanics_summary);
});

// --- ONBOARDING SCHOLAR'S TOUR INTEGRATION TESTS ---

test("Scholar's Tour step definitions and controller integration validation", async () => {
  const fs = require('fs');
  const path = require('path');

  // 1. Verify app.js defines the 5 tour steps and controller methods
  const appJsPath = path.join(__dirname, '..', 'public', 'js', 'app.js');
  const appJsContent = fs.readFileSync(appJsPath, 'utf8');

  // Verify controller methods exist
  assert.ok(appJsContent.includes('initScholarTour()'), 'app.js should contain initScholarTour()');
  assert.ok(appJsContent.includes('startScholarTour()'), 'app.js should contain startScholarTour()');
  assert.ok(appJsContent.includes('renderTourStep()'), 'app.js should contain renderTourStep()');
  assert.ok(appJsContent.includes('nextScholarTourStep()'), 'app.js should contain nextScholarTourStep()');
  assert.ok(appJsContent.includes('prevScholarTourStep()'), 'app.js should contain prevScholarTourStep()');
  assert.ok(appJsContent.includes('endScholarTour()'), 'app.js should contain endScholarTour()');

  // Verify Command Palette contains start tour action
  assert.ok(appJsContent.includes("🎓 Start Scholar's Orientation Tour"), 'Command Palette should include Start Scholar\'s Tour option');

  // Verify the 5 Scholar's Tour step definitions
  const tourSteps = [
    {
      target: '#nav-tabs-container',
      tab: 'frontpage',
      title: '🗺️ Workspace Navigation Tabs',
      desc: 'Switch effortlessly between World Wiki Frontpage, Reader Codex, World Atlas Maps, Timeline Chronology, and Faction Matrix.',
      kbd: ''
    },
    {
      target: '#btn-new-article',
      tab: 'library',
      title: '📝 Lore Creation & Cross-Linking',
      desc: 'Create rich lore articles with WorldAnvil templates. Type @ inside the editor to auto-complete cross-links to other articles!',
      kbd: ''
    },
    {
      target: '#tab-atlas',
      tab: 'atlas',
      title: '🪐 Interactive World Atlas',
      desc: 'Explore custom maps, drop location pins, draw expedition routes, and toggle DM Secret Filters for tabletop sessions.',
      kbd: ''
    },
    {
      target: '#zen-mode-toggle',
      tab: 'library',
      title: '📜 Zen Writer & Weave Matrix',
      desc: 'Draft prose in distraction-free Zen Reader mode. Stage your active chapter into the Weave Matrix context builder for AI assistance.',
      kbd: 'Ctrl + Shift + F & Ctrl + Shift + M'
    },
    {
      target: '#concierge-nav-btn',
      tab: 'frontpage',
      title: '✨ Welcome Concierge & Hotkeys',
      desc: 'Launch your AI Journey Concierge anytime with Ctrl+Shift+W, or press Ctrl+K for Universal Search across your entire world!',
      kbd: 'Ctrl + Shift + W & Ctrl + K'
    }
  ];

  assert.strictEqual(tourSteps.length, 5, 'Should have exactly 5 onboarding tour steps');

  // Validate step 1: Navigation Tabs
  assert.ok(tourSteps[0].title.includes('Navigation Tabs'));
  assert.strictEqual(tourSteps[0].target, '#nav-tabs-container');
  assert.strictEqual(tourSteps[0].tab, 'frontpage');

  // Validate step 2: Lore Creation & Cross-Links
  assert.ok(tourSteps[1].title.includes('Lore Creation') || tourSteps[1].title.includes('Cross-Link'));
  assert.strictEqual(tourSteps[1].target, '#btn-new-article');
  assert.strictEqual(tourSteps[1].tab, 'library');

  // Validate step 3: Interactive World Atlas
  assert.ok(tourSteps[2].title.includes('World Atlas') || tourSteps[2].title.includes('Interactive World Atlas'));
  assert.strictEqual(tourSteps[2].target, '#tab-atlas');
  assert.strictEqual(tourSteps[2].tab, 'atlas');

  // Validate step 4: Zen Writer & Weave Matrix
  assert.ok(tourSteps[3].title.includes('Zen Writer') || tourSteps[3].title.includes('Weave Matrix'));
  assert.strictEqual(tourSteps[3].target, '#zen-mode-toggle');
  assert.strictEqual(tourSteps[3].tab, 'library');
  assert.ok(tourSteps[3].kbd.includes('Ctrl + Shift + F'));

  // Validate step 5: Concierge & Hotkeys
  assert.ok(tourSteps[4].title.includes('Concierge') || tourSteps[4].title.includes('Hotkeys'));
  assert.strictEqual(tourSteps[4].target, '#concierge-nav-btn');
  assert.strictEqual(tourSteps[4].tab, 'frontpage');
  assert.ok(tourSteps[4].kbd.includes('Ctrl + Shift + W'));

  // 2. Verify index.html contains the onboarding overlay containers
  const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  assert.ok(htmlContent.includes('id="onboarding-spotlight-overlay"'), 'HTML must have #onboarding-spotlight-overlay');
  assert.ok(htmlContent.includes('id="spotlight-active-ring"'), 'HTML must have #spotlight-active-ring');
  assert.ok(htmlContent.includes('id="onboarding-tooltip-card"'), 'HTML must have #onboarding-tooltip-card');
  assert.ok(htmlContent.includes('id="tour-step-badge"'), 'HTML must have #tour-step-badge');
  assert.ok(htmlContent.includes('id="tour-step-title"'), 'HTML must have #tour-step-title');
  assert.ok(htmlContent.includes('id="tour-step-desc"'), 'HTML must have #tour-step-desc');
  assert.ok(htmlContent.includes('id="tour-step-kbd"'), 'HTML must have #tour-step-kbd');
  assert.ok(htmlContent.includes('id="tour-btn-prev"'), 'HTML must have #tour-btn-prev');
  assert.ok(htmlContent.includes('id="tour-btn-next"'), 'HTML must have #tour-btn-next');
});

// --- CUSTOM TEMPLATES & REVISION HISTORY TESTS ---

test('GET & POST /api/templates handles custom category template CRUD', async () => {
  const createRes = await makeRequest('/api/templates', { method: 'POST' }, {
    name: 'Magic System',
    category: 'Magic',
    icon: '✨',
    fields_json: ['Power Source', 'Deity'],
    boilerplate_markdown: '# Magic System Overview'
  });

  assert.strictEqual(createRes.statusCode, 200);
  assert.strictEqual(createRes.json.success, true);
  assert.ok(createRes.json.id);

  const getRes = await makeRequest('/api/templates');
  assert.strictEqual(getRes.statusCode, 200);
  assert.ok(Array.isArray(getRes.json.templates));
  assert.ok(getRes.json.templates.some(t => t.name === 'Magic System'));

  const delRes = await makeRequest(`/api/templates/${createRes.json.id}`, { method: 'DELETE' });
  assert.strictEqual(delRes.statusCode, 200);
  assert.strictEqual(delRes.json.success, true);
});

test('GET /api/articles/:id/history & POST /api/articles/:id/rollback restores article revision', async () => {
  const uniqueTitle = 'Revision Test Article ' + Date.now();
  const artRes1 = await makeRequest('/api/articles', { method: 'POST' }, {
    title: uniqueTitle,
    category: 'General',
    content: 'Initial content before edit'
  });
  assert.strictEqual(artRes1.statusCode, 201);
  const artId = artRes1.json.id;

  await makeRequest(`/api/articles/${artId}`, { method: 'PUT' }, {
    title: uniqueTitle,
    category: 'General',
    content: 'Updated content after edit'
  });
  
  const histRes = await makeRequest(`/api/articles/${artId}/history`);
  assert.strictEqual(histRes.statusCode, 200);
  assert.ok(Array.isArray(histRes.json.history));
  assert.ok(histRes.json.history.length > 0);

  const targetSnapshotFile = histRes.json.history[0].file;

  const rollbackRes = await makeRequest(`/api/articles/${artId}/rollback`, { method: 'POST' }, {
    file: targetSnapshotFile
  });

  assert.strictEqual(rollbackRes.statusCode, 200);
  assert.strictEqual(rollbackRes.json.success, true);
  assert.strictEqual(rollbackRes.json.article_id, artId);
});

test('GET /api/search/fts performs SQLite FTS5 full-text search with highlight snippets', async () => {
  const res = await makeRequest('/api/search/fts?q=Roderick');
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(typeof res.json.total_results, 'number');
  assert.ok(Array.isArray(res.json.results));
});

test('POST /api/timeline/extract-event extracts event details from prose text selection', async () => {
  const res = await makeRequest('/api/timeline/extract-event', { method: 'POST' }, {
    text: 'In the year 1420, High King Roderick established the Dragon Pact at Aethelgard.'
  });
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.json.success, true);
  assert.strictEqual(res.json.display_year, '1420');
});

test('POST /api/audit/auto-crosslink auto-inserts entity crosslink references', async () => {
  const res = await makeRequest('/api/audit/auto-crosslink', { method: 'POST' }, { world_id: 'default' });
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.json.success, true);
  assert.strictEqual(typeof res.json.updated_articles_count, 'number');
});

test('POST /api/audit/check-continuity verifies article continuity against world canon', async () => {
  const res = await makeRequest('/api/audit/check-continuity', { method: 'POST' }, { world_id: 'default', article_id: 'art_aethelgard_1' });
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.json.success, true);
  assert.strictEqual(typeof res.json.contradiction_score, 'number');
});

test('GET & POST /api/articles/:id/persona and /api/ai/npc-chat manages character roleplay persona', async () => {
  const postRes = await makeRequest('/api/articles/char_test_1/persona', { method: 'POST' }, {
    thoughts: 'Protect the kingdom at all costs.',
    wants: 'Peaceful borders',
    needs: 'Trustworthy generals',
    speech_mannerisms: 'Speaks with formal royal authority.'
  });
  assert.strictEqual(postRes.statusCode, 200);
  assert.strictEqual(postRes.json.success, true);

  const getRes = await makeRequest('/api/articles/char_test_1/persona');
  assert.strictEqual(getRes.statusCode, 200);
  assert.strictEqual(getRes.json.success, true);
  assert.strictEqual(getRes.json.persona.thoughts, 'Protect the kingdom at all costs.');

  const chatRes = await makeRequest('/api/ai/npc-chat', { method: 'POST' }, {
    character_id: 'char_test_1',
    user_message: 'Will you support the alliance?'
  });
  assert.strictEqual(chatRes.statusCode, 200);
  assert.strictEqual(chatRes.json.success, true);
  assert.ok(chatRes.json.reply.length > 0);
});

test('GET & POST /api/maps/:mapId/fog persists Fog-of-War canvas state', async () => {
  const postRes = await makeRequest('/api/maps/map_test_1/fog', { method: 'POST' }, {
    fog_data_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  });
  assert.strictEqual(postRes.statusCode, 200);
  assert.strictEqual(postRes.json.success, true);

  const getRes = await makeRequest('/api/maps/map_test_1/fog');
  assert.strictEqual(getRes.statusCode, 200);
  assert.strictEqual(getRes.json.success, true);
  assert.ok(getRes.json.fog_data_url.startsWith('data:image/png'));
});

test('POST /api/timeline/anachronism-audit scans timeline for chronological anomalies', async () => {
  const res = await makeRequest('/api/timeline/anachronism-audit', { method: 'POST' }, { world_id: 'default' });
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.json.success, true);
  assert.strictEqual(typeof res.json.total_events_scanned, 'number');
  assert.ok(Array.isArray(res.json.character_ages));
});

// ====================================================
// 🗓️ 1. CHRONOS MATRIX INTEGRATION TESTS
// ====================================================

test('Chronos Matrix: custom calendars, celestial date calculation & era forks', async () => {
  // Create custom calendar
  const createCal = await makeRequest('/api/calendars', { method: 'POST' }, {
    world_id: 'default',
    name: 'Imperial Solar Reckoning',
    days_per_year: 360,
    months: [
      { name: 'Sol-Prime', days: 90, season: 'Spring' },
      { name: 'Aether-Mid', days: 90, season: 'Summer' },
      { name: 'Harvest-Fall', days: 90, season: 'Autumn' },
      { name: 'Frost-End', days: 90, season: 'Winter' }
    ],
    weekdays: ['Firstday', 'Moonday', 'Starday', 'Windday', 'Sunrest'],
    moon_cycles: [
      { name: 'Silver Veil', cycle_days: 28, color: '#e0e0e0' },
      { name: 'Blood Orb', cycle_days: 45, color: '#f43f5e' }
    ],
    epoch_name: 'Age of Sun',
    current_year: 1042,
    current_day: 145,
    is_secret: 0
  });
  assert.strictEqual(createCal.statusCode, 200);
  assert.strictEqual(createCal.json.success, true);
  const calId = createCal.json.id;

  // List calendars
  const listCals = await makeRequest('/api/worlds/default/calendars');
  assert.strictEqual(listCals.statusCode, 200);
  assert.ok(Array.isArray(listCals.json.calendars));
  assert.ok(listCals.json.calendars.some(c => c.id === calId));

  // Calculate celestial date
  const calcRes = await makeRequest('/api/calendars/calculate-date', { method: 'POST' }, {
    days_per_year: 360,
    months: [
      { name: 'Sol-Prime', days: 90, season: 'Spring' },
      { name: 'Aether-Mid', days: 90, season: 'Summer' }
    ],
    weekdays: ['Firstday', 'Moonday', 'Starday'],
    moon_cycles: [{ name: 'Silver Veil', cycle_days: 28 }],
    current_year: 1000,
    current_day: 45,
    total_day_offset: 10
  });
  assert.strictEqual(calcRes.statusCode, 200);
  assert.strictEqual(calcRes.json.success, true);
  assert.strictEqual(calcRes.json.month, 'Sol-Prime');
  assert.strictEqual(calcRes.json.day_in_month, 55);
  assert.ok(Array.isArray(calcRes.json.moon_phases));

  // Create & list era forks
  const createEra = await makeRequest('/api/era-forks', { method: 'POST' }, {
    world_id: 'default',
    name: 'The Broken Eclipse',
    start_year: 850,
    end_year: 1100,
    divergence_event: 'Shattered Sunstone',
    description: 'Timeline divergence into dark arcane winter.'
  });
  assert.strictEqual(createEra.statusCode, 200);
  assert.strictEqual(createEra.json.success, true);

  const listEras = await makeRequest('/api/worlds/default/era-forks');
  assert.strictEqual(listEras.statusCode, 200);
  assert.ok(Array.isArray(listEras.json.era_forks));
  assert.ok(listEras.json.era_forks.some(e => e.name === 'The Broken Eclipse'));
});

// ====================================================
// ⚡ 2. ARCANE & TECH RESONANCE MATRIX TESTS
// ====================================================

test('Arcane & Tech Resonance Matrix: hard laws, article audit & VTT export', async () => {
  // Create hard law
  const createLaw = await makeRequest('/api/laws', { method: 'POST' }, {
    world_id: 'default',
    system_name: 'Solar Leyline Weaving',
    law_type: 'magic',
    power_source: 'Solar Ley Crystals',
    fuel_or_cost: 'Physical Stamina & Refined Silver',
    forbidden_acts: 'Resurrection, Perpetual Motion',
    backlash_consequences: 'Arcane Necrosis & Mana Burn',
    tier_limits: 'Tier 1 to 5',
    is_secret: 0
  });
  assert.strictEqual(createLaw.statusCode, 200);
  assert.strictEqual(createLaw.json.success, true);
  const lawId = createLaw.json.id;

  // List laws
  const listLaws = await makeRequest('/api/worlds/default/laws');
  assert.strictEqual(listLaws.statusCode, 200);
  assert.ok(Array.isArray(listLaws.json.laws));
  assert.ok(listLaws.json.laws.some(l => l.id === lawId));

  // Audit article text with violation
  const auditViolation = await makeRequest('/api/laws/audit-article', { method: 'POST' }, {
    world_id: 'default',
    content: 'The rogue mage attempted forbidden resurrection using solar ley crystals.'
  });
  assert.strictEqual(auditViolation.statusCode, 200);
  assert.strictEqual(auditViolation.json.is_compliant, false);
  assert.strictEqual(auditViolation.json.violations_count >= 1, true);
  assert.ok(auditViolation.json.violations.some(v => v.violation_type.includes('Forbidden Act')));

  // Export to VTT
  const exportRes = await makeRequest(`/api/laws/${lawId}/export/vtt`);
  assert.strictEqual(exportRes.statusCode, 200);
  assert.strictEqual(exportRes.json.type, 'vtt_rule_system');
  assert.strictEqual(exportRes.json.name, 'Solar Leyline Weaving');
});

// ====================================================
// 🌿 3. BIOME & LIVING ECOLOGY SIMULATOR TESTS
// ====================================================

test('Biome & Living Ecology Simulator: biomes, trophic food web & scarcity simulation', async () => {
  // Create biome
  const createBiome = await makeRequest('/api/biomes', { method: 'POST' }, {
    world_id: 'default',
    name: 'Whispering Boreal Basin',
    climate_temp: 'cold',
    moisture_level: 'wet',
    dominant_resources: 'Lumber, Frostberry, Iron Ore',
    scarcity_factors: 'Freshwater, Arable Soil',
    is_secret: 0
  });
  assert.strictEqual(createBiome.statusCode, 200);
  assert.strictEqual(createBiome.json.success, true);
  const biomeId = createBiome.json.id;

  // Create species
  const createSpecies = await makeRequest('/api/species', { method: 'POST' }, {
    world_id: 'default',
    biome_id: biomeId,
    name: 'Frostfire Wyvern',
    trophic_level: 'apex_predator',
    diet_or_fuel: 'Boreal Stag',
    predators: [],
    prey: ['Boreal Stag'],
    harvestable_yields: 'Wyvern Scales, Glacial Bile',
    danger_rating: 'deadly',
    is_secret: 0
  });
  assert.strictEqual(createSpecies.statusCode, 200);
  assert.strictEqual(createSpecies.json.success, true);

  // Get trophic web
  const webRes = await makeRequest('/api/worlds/default/trophic-web');
  assert.strictEqual(webRes.statusCode, 200);
  assert.ok(Array.isArray(webRes.json.species));
  assert.ok(webRes.json.species.some(s => s.name === 'Frostfire Wyvern'));

  // Simulate scarcity
  const scarcityRes = await makeRequest('/api/ecology/simulate-scarcity', { method: 'POST' }, { world_id: 'default' });
  assert.strictEqual(scarcityRes.statusCode, 200);
  assert.strictEqual(scarcityRes.json.success, true);
  assert.ok(typeof scarcityRes.json.biomes_evaluated === 'number');
});

// ====================================================
// 🗣️ 4. ETHOS & VERNACULAR SYNTHESIZER TESTS
// ====================================================

test('Ethos & Vernacular Synthesizer: cultural dialects & slang generation', async () => {
  // Create dialect
  const createDialect = await makeRequest('/api/dialects', { method: 'POST' }, {
    world_id: 'default',
    culture_or_faction: 'Ironclad Forge Guilds',
    linguistic_register: 'gritty_archaic',
    greetings: ['May your forge never cool', 'Stone preserve you'],
    oaths_curses: ['By the shattered anvil!'],
    proverbs: ['An oath unkept is an axe in one\'s foot'],
    cardinal_virtues: 'Craftsmanship, Oath-keeping',
    taboos_forbidden: 'Melting unbroken heirloom weapons',
    naming_conventions: '[Prefix][Mineral] + [Deed]son',
    is_secret: 0
  });
  assert.strictEqual(createDialect.statusCode, 200);
  assert.strictEqual(createDialect.json.success, true);

  // List dialects
  const listDialects = await makeRequest('/api/worlds/default/dialects');
  assert.strictEqual(listDialects.statusCode, 200);
  assert.ok(Array.isArray(listDialects.json.dialects));
  assert.ok(listDialects.json.dialects.some(d => d.culture_or_faction === 'Ironclad Forge Guilds'));

  // Generate slang
  const slangRes = await makeRequest('/api/dialects/generate-slang', { method: 'POST' }, {
    culture_name: 'Ironclad Forge Guilds',
    genre_tone: 'gritty_archaic'
  });
  assert.strictEqual(slangRes.statusCode, 200);
  assert.strictEqual(slangRes.json.success, true);
  assert.ok(slangRes.json.data.greetings.length > 0);
});

// ====================================================
// 🏛️ 5. PANTHEON & DIVINE COVENANT TESTS
// ====================================================

test('Pantheon & Divine Covenant Matrix: deities, omen simulation & player secret filtering', async () => {
  // Create deity
  const createDeity = await makeRequest('/api/deities', { method: 'POST' }, {
    world_id: 'default',
    name: 'Solari the Dawn-Bringer',
    domains: 'Sun, Justice, Metallurgy',
    symbol_and_avatar: 'Blazing Brass Sunburst / Giant Golden Eagle',
    alignment: 'Lawful Good',
    piety_boons: ['Tier 1: Radiant Guidance', 'Tier 2: Dawn\'s Ward'],
    transgression_curses: ['Solar Blindness', 'Brittle Steel'],
    astrological_omen_trigger: 'During solar eclipses or summer solstices',
    is_secret: 0
  });
  assert.strictEqual(createDeity.statusCode, 200);
  assert.strictEqual(createDeity.json.success, true);

  // Create secret deity for DM filtering check
  const secretDeity = await makeRequest('/api/deities', { method: 'POST' }, {
    world_id: 'default',
    name: 'The Nameless Betrayer',
    domains: 'Shadow, Treason',
    symbol_and_avatar: 'Obsidian Dagger',
    alignment: 'Chaotic Evil',
    piety_boons: [],
    transgression_curses: [],
    astrological_omen_trigger: 'Blood Moon',
    is_secret: 1
  });
  assert.strictEqual(secretDeity.statusCode, 200);

  // Player mode check
  const playerPantheon = await makeRequest('/api/worlds/default/pantheon?mode=player');
  assert.strictEqual(playerPantheon.statusCode, 200);
  assert.ok(!playerPantheon.json.pantheon.some(d => d.name === 'The Nameless Betrayer'));
  assert.ok(playerPantheon.json.pantheon.some(d => d.name === 'Solari the Dawn-Bringer'));

  // Omen simulation check
  const omenRes = await makeRequest('/api/pantheon/simulate-omen', { method: 'POST' }, {
    world_id: 'default',
    celestial_event: 'Solar Eclipse',
    season: 'Summer Solstice'
  });
  assert.strictEqual(omenRes.statusCode, 200);
  assert.strictEqual(omenRes.json.success, true);
  assert.ok(omenRes.json.active_omens.some(o => o.deity_name === 'Solari the Dawn-Bringer'));
});

test('Writer Journey Suite: Manuscript Binder CRUD, Reordering, and Export', async () => {
  // 1. Create chapters across Acts
  const ch1 = await makeRequest('/api/manuscripts/chapters', { method: 'POST' }, {
    world_id: 'default',
    act_number: 1,
    chapter_number: 1,
    title: 'The Whispering Shadows',
    summary: 'Lady Aris enters the forbidden archives in search of the ancient glyph.',
    target_word_count: 2500,
    content: 'The moonlight filtered through the shattered stained glass, casting obsidian shadows across the ancient stone floor. "We should not be here," whispered Roland, his hand trembling on his sword hilt. "The archives have slept for five centuries."',
    status: 'Draft',
    sort_order: 1
  });
  assert.strictEqual(ch1.statusCode, 201);
  assert.strictEqual(ch1.json.success, true);
  assert.ok(ch1.json.id);

  const ch2 = await makeRequest('/api/manuscripts/chapters', { method: 'POST' }, {
    world_id: 'default',
    act_number: 1,
    chapter_number: 2,
    title: 'Echoes in the Catacombs',
    summary: 'The expedition uncovers the sealed vault door.',
    target_word_count: 3000,
    content: 'Deep beneath the city, the cold air smelled of damp earth and centuries of dust. [secret]The vault is guarded by a spectral sentinel.[/secret] "Look closely," Aris murmured.',
    status: 'Revision',
    sort_order: 2
  });
  assert.strictEqual(ch2.statusCode, 201);

  // 2. Fetch manuscript binder overview
  const binderRes = await makeRequest('/api/manuscripts/default');
  assert.strictEqual(binderRes.statusCode, 200);
  assert.strictEqual(binderRes.json.success, true);
  assert.ok(binderRes.json.total_chapters >= 2);
  assert.ok(binderRes.json.acts.length >= 1);
  assert.ok(binderRes.json.total_words > 0);

  // 3. Reorder chapters
  const reorderRes = await makeRequest('/api/manuscripts/reorder', { method: 'POST' }, {
    chapter_orders: [
      { id: ch1.json.id, sort_order: 2, act_number: 1, chapter_number: 2 },
      { id: ch2.json.id, sort_order: 1, act_number: 1, chapter_number: 1 }
    ]
  });
  assert.strictEqual(reorderRes.statusCode, 200);
  assert.strictEqual(reorderRes.json.success, true);

  // 4. Export manuscript with player secret filtering
  const exportRes = await makeRequest('/api/manuscripts/export', { method: 'POST' }, {
    world_id: 'default',
    mode: 'player',
    include_summaries: true
  });
  assert.strictEqual(exportRes.statusCode, 200);
  assert.strictEqual(exportRes.json.success, true);
  assert.ok(exportRes.json.compiled_manuscript.includes('# ACT 1'));
  assert.ok(!exportRes.json.compiled_manuscript.includes('spectral sentinel')); // Secret block stripped
});

test('Writer Journey Suite: Dynamic Margin Inspector & Unlinked Mentions Scanner', async () => {
  // Test entity inspector by query
  const inspectRes = await makeRequest('/api/lore/inspector-entity?world_id=default&query=Chronicles');
  assert.ok([200, 404].includes(inspectRes.statusCode));

  // Test unlinked mentions scan
  const unlinkedRes = await makeRequest('/api/lore/unlinked-mentions', { method: 'POST' }, {
    world_id: 'default',
    text: 'During the high council, Lord Vane spoke of the Great Kingdom and the ancient dragon.'
  });
  assert.strictEqual(unlinkedRes.statusCode, 200);
  assert.strictEqual(unlinkedRes.json.success, true);
  assert.ok(Array.isArray(unlinkedRes.json.unlinked_mentions));
});

test('Writer Journey Suite: Autosave Delta Buffer & Crash Recovery', async () => {
  const saveBuf = await makeRequest('/api/manuscripts/autosave-buffer', { method: 'POST' }, {
    target_id: 'test_ch_99',
    target_type: 'chapter',
    content: 'Live drafting in progress without loss.',
    word_count: 6,
    wpm: 45.2,
    cursor_pos: 38
  });
  assert.strictEqual(saveBuf.statusCode, 200);
  assert.strictEqual(saveBuf.json.success, true);

  const getBuf = await makeRequest('/api/manuscripts/autosave-buffer/chapter/test_ch_99');
  assert.strictEqual(getBuf.statusCode, 200);
  assert.strictEqual(getBuf.json.success, true);
  assert.strictEqual(getBuf.json.buffer.content, 'Live drafting in progress without loss.');
  assert.strictEqual(getBuf.json.buffer.word_count, 6);
});

test('Writer Journey Suite: Analytical Prose Telemetry & Stylistic Health', async () => {
  const sampleProse = `The obsidian shadows crept silently across the cold stone floor. "We must hurry," whispered Elena, clutching the golden amulet. The night was bitter and damp, and an acrid scent of sulfur hung in the air. The heavy oak door was locked by the guards. He glanced back, staring into the dark corridor.`;

  const telemetryRes = await makeRequest('/api/prose/analyze-telemetry', { method: 'POST' }, {
    text: sampleProse
  });

  assert.strictEqual(telemetryRes.statusCode, 200);
  assert.strictEqual(telemetryRes.json.success, true);
  assert.ok(telemetryRes.json.total_words > 20);
  assert.ok(telemetryRes.json.sentence_count >= 4);
  assert.ok(telemetryRes.json.sensory_density.total_sensory > 0);
  assert.ok(telemetryRes.json.sensory_density.visual > 0);
  assert.ok(telemetryRes.json.sensory_density.tactile > 0);
  assert.ok(telemetryRes.json.dialogue_ratio.dialogue_pct > 0);
  assert.ok(telemetryRes.json.stylistic_friction.adverb_count >= 1);
  assert.ok(telemetryRes.json.readability.reading_ease >= 0);
});

test('Writer Journey Suite: Socratic Causality Auditor & Character Voice Mirror', async () => {
  const sceneText = `Elena slipped into the high vault. She seized the ancient crown, ignoring the sleeping chimera. "This will pay my family debts," she said quietly.`;

  // Socratic Scene Audit
  const auditRes = await makeRequest('/api/prose/socratic-audit', { method: 'POST' }, {
    scene_text: sceneText,
    scene_goal: 'Retrieve the ancestral crown',
    characters_present: 'Elena, Sleeping Chimera'
  });
  assert.strictEqual(auditRes.statusCode, 200);
  assert.strictEqual(auditRes.json.success, true);
  assert.ok(auditRes.json.socratic_verdict);
  assert.ok(Array.isArray(auditRes.json.five_whys_probes));

  // Voice Mirror
  const voiceRes = await makeRequest('/api/prose/voice-mirror', { method: 'POST' }, {
    character_name: 'Elena',
    scene_text: sceneText
  });
  assert.strictEqual(voiceRes.statusCode, 200);
  assert.strictEqual(voiceRes.json.success, true);
  assert.strictEqual(voiceRes.json.character_name, 'Elena');
  assert.ok(typeof voiceRes.json.voice_consistency_score === 'number');
});


