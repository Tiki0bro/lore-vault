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

