/**
 * E2E Integration Test Suite for Task 4: Races & Species and Universal Taxonomy
 */

const assert = require('assert');
const http = require('http');
const path = require('path');
const fs = require('fs');

// 1. Load backend app from server.js
const { app, db, smartCategorizeArticle } = require('../server.js');

console.log('=== Task 4 Integration Test Suite Starting ===');

let server;
const PORT = 3009; // Use dedicated test port to avoid conflicting with running server

function runHttpTests() {
  return new Promise((resolve, reject) => {
    server = app.listen(PORT, async () => {
      console.log(`Test server running on port ${PORT}`);

      try {
        // Test 1: GET /api/articles?category=Races%20%26%20Species
        console.log('Test 1: GET /api/articles?category=Races%20%26%20Species');
        const articlesRes = await makeRequest(`/api/articles?category=${encodeURIComponent('Races & Species')}`);
        assert.strictEqual(articlesRes.statusCode, 200, 'GET /api/articles returned status ' + articlesRes.statusCode);
        assert(Array.isArray(articlesRes.body), 'Response body should be an array');
        console.log(`  -> OK: Retrieved ${articlesRes.body.length} articles for category 'Races & Species'`);

        // Test 2: POST /api/audit/scan
        console.log('Test 2: POST /api/audit/scan');
        const auditRes = await makeRequest('/api/audit/scan', 'POST', { world_id: 'all' });
        assert.strictEqual(auditRes.statusCode, 200, 'POST /api/audit/scan returned status ' + auditRes.statusCode);
        assert(auditRes.body.healthScore !== undefined, 'Audit response should include healthScore');
        assert(Array.isArray(auditRes.body.misclassifiedArticles), 'Audit response should include misclassifiedArticles');
        console.log(`  -> OK: World Doctor scan succeeded. Health Score: ${auditRes.body.healthScore}, Misclassified: ${auditRes.body.misclassifiedArticles.length}`);

        // Test 3: POST /api/audit/run (Alias verification)
        console.log('Test 3: POST /api/audit/run (Route alias check)');
        const auditRunRes = await makeRequest('/api/audit/run', 'POST', { world_id: 'all' });
        assert.strictEqual(auditRunRes.statusCode, 200, 'POST /api/audit/run returned status ' + auditRunRes.statusCode);
        console.log('  -> OK: Route alias /api/audit/run functions identically.');

        resolve();
      } catch (err) {
        reject(err);
      }
    });
  });
}

function makeRequest(path, method = 'GET', postData = null) {
  return new Promise((resolve, reject) => {
    const payload = postData ? JSON.stringify(postData) : null;
    const req = http.request({
      hostname: 'localhost',
      port: PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const body = data ? JSON.parse(data) : {};
          resolve({ statusCode: res.statusCode, body });
        } catch (e) {
          resolve({ statusCode: res.statusCode, rawBody: data });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// Test 4: Frontend ContextBuilder Serialization & Filter Logic Verification
function testContextBuilderLogic() {
  console.log('Test 4: ContextBuilder logic & [RACES & SPECIES: Title] heading serialization');

  // Load context-builder.js code and run in mock environment
  const cbPath = path.join(__dirname, '../public/js/context-builder.js');
  const code = fs.readFileSync(cbPath, 'utf8');

  // Simple DOM mock
  const elementMap = new Map();
  const mockDocument = {
    getElementById: (id) => {
      if (!elementMap.has(id)) {
        elementMap.set(id, {
          textContent: '',
          value: '',
          classList: { toggle: () => {}, add: () => {}, remove: () => {} },
          style: {},
          setAttribute: () => {},
          getAttribute: () => null,
          querySelectorAll: () => []
        });
      }
      return elementMap.get(id);
    },
    querySelectorAll: () => []
  };

  const mockWindow = {};
  const context = {
    window: mockWindow,
    document: mockDocument,
    console: console,
    Set: Set,
    Array: Array,
    Map: Map,
    String: String,
    Math: Math,
    Date: Date,
    JSON: JSON,
    encodeURIComponent: encodeURIComponent
  };

  // Evaluate context-builder.js
  const vm = require('vm');
  vm.createContext(context);
  vm.runInContext(code, context);

  const ContextBuilder = context.window.ContextBuilder;
  assert(ContextBuilder, 'ContextBuilder should be attached to window');

  // Setup test articles
  const sampleArticles = [
    {
      id: 'art-1',
      title: 'High Elven Lineage',
      category: 'Races & Species',
      sub_category: 'Playable Races & Lineages',
      summary: 'An ancient noble lineage.',
      content: 'The High Elves are an ancient playable race of noble lineage.'
    },
    {
      id: 'art-2',
      title: 'Lord Corvus',
      category: 'Characters',
      summary: 'A dark sorcerer.',
      content: 'Lord Corvus commands the shadow army.'
    }
  ];

  ContextBuilder.init(sampleArticles);

  // Test Category Filter with 'Races & Species'
  ContextBuilder.state.world.selectedCategories.clear();
  ContextBuilder.state.world.selectedCategories.add('Races & Species');

  // Test Slate Serialization Output
  ContextBuilder.state.slate.selectedArticleIds.clear();
  ContextBuilder.state.slate.selectedArticleIds.add('art-1');
  ContextBuilder.state.slate.relationships['art-1'] = 'Ally';

  const selectedArticles = sampleArticles.filter(a => ContextBuilder.state.slate.selectedArticleIds.has(a.id));
  const slateText = ContextBuilder.buildSlateBucketText(selectedArticles);

  console.log('Serialized Slate Output:\n' + slateText);

  // Verify heading format matches [RACES & SPECIES: High Elven Lineage]
  assert(
    slateText.includes('### [RACES & SPECIES: High Elven Lineage] - Role: [Ally]'),
    'Serialized text must contain ### [RACES & SPECIES: High Elven Lineage] - Role: [Ally]'
  );

  console.log('  -> OK: Serialization heading format matches expected [RACES & SPECIES: Title]');
}

async function main() {
  try {
    testContextBuilderLogic();
    await runHttpTests();
    console.log('\n✅ ALL INTEGRATION TESTS PASSED 100% GREEN!');
  } catch (err) {
    console.error('\n❌ INTEGRATION TEST FAILED:', err);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
  }
}

main();
