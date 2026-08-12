const http = require('http');
const assert = require('assert');
const { app } = require('../server.js');

const PORT = 3998;

const server = app.listen(PORT, async () => {
  console.log(`Test server running on port ${PORT}...`);

  try {
    // 1. Test POST /api/narrative/compile-slate
    console.log('Testing POST /api/narrative/compile-slate...');
    const compilePayload = {
      plot_hook: "Elena intercepts an Imperial courier in the rain.",
      scene_steps: ["Elena confronts courier", "Courier reveals ambush", "Shadowy figure on balcony"],
      cast_ids: [],
      pinned_lore_ids: [],
      tone_chips: ["Gritty & Noir"],
      visibility: "public",
      max_tokens: 4000
    };

    const compileRes = await makeRequest('/api/narrative/compile-slate', 'POST', compilePayload);
    assert.strictEqual(compileRes.status, 200, 'compile-slate should return 200');
    assert.strictEqual(compileRes.body.status, 'success', 'compile-slate status should be success');
    assert.ok(compileRes.body.compiled_prompt.includes('Elena intercepts an Imperial courier'), 'compiled_prompt contains plot hook');
    assert.ok(compileRes.body.token_metrics.estimated_tokens > 0, 'token metrics estimated_tokens > 0');
    console.log('✅ POST /api/narrative/compile-slate passed!');

    // 2. Test POST /api/narrative/save-slate
    console.log('Testing POST /api/narrative/save-slate...');
    const savePayload = {
      name: "Test Ambush Slate",
      world_id: "default",
      plot_hook: compilePayload.plot_hook,
      scene_steps: compilePayload.scene_steps,
      cast_ids: compilePayload.cast_ids,
      pinned_lore_ids: compilePayload.pinned_lore_ids,
      tone_chips: compilePayload.tone_chips,
      visibility: compilePayload.visibility,
      format: "markdown",
      max_tokens: 4000
    };

    const saveRes = await makeRequest('/api/narrative/save-slate', 'POST', savePayload);
    assert.strictEqual(saveRes.status, 200, 'save-slate should return 200');
    assert.strictEqual(saveRes.body.status, 'success', 'save-slate status should be success');
    assert.ok(saveRes.body.id, 'save-slate should return a slate ID');
    const createdSlateId = saveRes.body.id;
    console.log('✅ POST /api/narrative/save-slate passed!');

    // 3. Test GET /api/narrative/slates
    console.log('Testing GET /api/narrative/slates...');
    const getRes = await makeRequest('/api/narrative/slates', 'GET');
    assert.strictEqual(getRes.status, 200, 'slates should return 200');
    assert.strictEqual(getRes.body.status, 'success', 'slates status should be success');
    assert.ok(Array.isArray(getRes.body.slates), 'slates should be an array');
    const found = getRes.body.slates.find(s => s.id === createdSlateId || s.name === "Test Ambush Slate");
    assert.ok(found, 'saved slate should be in retrieved slates');
    console.log('✅ GET /api/narrative/slates passed!');

    // 4. Test POST /api/narrative/continue-prose
    console.log('Testing POST /api/narrative/continue-prose...');
    const continueRes = await makeRequest('/api/narrative/continue-prose', 'POST', {
      compiled_prompt: compileRes.body.compiled_prompt,
      current_draft: "Elena raised her hood as rain poured down."
    });
    assert.strictEqual(continueRes.status, 200, 'continue-prose should return 200');
    assert.strictEqual(continueRes.body.status, 'success', 'continue-prose status should be success');
    assert.ok(continueRes.body.generated_text, 'continue-prose should return generated_text');
    console.log('✅ POST /api/narrative/continue-prose passed!');

    // 5. Test POST /api/narrative/pov-rewrite
    console.log('Testing POST /api/narrative/pov-rewrite...');
    const povRes = await makeRequest('/api/narrative/pov-rewrite', 'POST', {
      highlighted_text: "The courier backed away nervously.",
      pov_character_id: "char-elena"
    });
    assert.strictEqual(povRes.status, 200, 'pov-rewrite should return 200');
    assert.strictEqual(povRes.body.status, 'success', 'pov-rewrite status should be success');
    assert.ok(povRes.body.rewritten_text, 'pov-rewrite should return rewritten_text');
    console.log('✅ POST /api/narrative/pov-rewrite passed!');

    // 6. Test POST /api/narrative/suggest-beats
    console.log('Testing POST /api/narrative/suggest-beats...');
    const beatsRes = await makeRequest('/api/narrative/suggest-beats', 'POST', {
      compiled_prompt: compileRes.body.compiled_prompt,
      current_draft: "Elena raised her hood as rain poured down."
    });
    assert.strictEqual(beatsRes.status, 200, 'suggest-beats should return 200');
    assert.strictEqual(beatsRes.body.status, 'success', 'suggest-beats status should be success');
    assert.ok(Array.isArray(beatsRes.body.beats), 'suggest-beats should return array of beats');
    assert.strictEqual(beatsRes.body.beats.length, 3, 'suggest-beats should return 3 beats');
    console.log('✅ POST /api/narrative/suggest-beats passed!');

    console.log('\n🎉 ALL NARRATIVE SLATE API SUITE INTEGRATION TESTS PASSED!');
    server.close(() => {
      process.exit(0);
    });
  } catch (err) {
    console.error('❌ Test failed:', err);
    server.close(() => {
      process.exit(1);
    });
  }
});

function makeRequest(path, method, body = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {})
      }
    }, (res) => {
      let resBody = '';
      res.on('data', chunk => resBody += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(resBody);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: resBody });
        }
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}
