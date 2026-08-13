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
  if (serverProcess && serverProcess.close) {
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
  const newArticle = {
    title: 'Test Hardening Article',
    category: 'History',
    content: 'This is a test article created by the automated API test suite.',
    tags: ['test', 'hardening'],
    world_id: 'default'
  };

  const res = await makeRequest('/api/articles', { method: 'POST' }, newArticle);
  assert.ok(res.statusCode === 200 || res.statusCode === 201);
  assert.ok(res.json.id);
  assert.strictEqual(res.json.title, 'Test Hardening Article');

  const getRes = await makeRequest(`/api/articles/${res.json.id}`);
  assert.strictEqual(getRes.statusCode, 200);
  assert.strictEqual(getRes.json.title, 'Test Hardening Article');
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
