const path = require('path');
const http = require('http');
const { app, db } = require('../server');

async function runTests() {
  console.log('--- Starting Atlas v2 Backend Verification Tests ---');

  // Wait brief moment for DB serialize block in server.js to run
  await new Promise(r => setTimeout(r, 500));

  // Helper for DB query as promise
  const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
  });

  const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function(err) { err ? reject(err) : resolve(this); });
  });

  // 1. Schema Verification
  console.log('\n[1/4] Verifying Database Schemas...');
  
  const mapsCols = (await dbAll("PRAGMA table_info(maps)")).map(c => c.name);
  const requiredMapsCols = ['parent_map_id', 'parent_pin_id', 'scale_pixels', 'scale_distance', 'scale_unit'];
  for (const col of requiredMapsCols) {
    if (!mapsCols.includes(col)) {
      throw new Error(`Missing expected column '${col}' in maps table! Columns found: ${mapsCols.join(', ')}`);
    }
  }
  console.log('✓ maps table contains all required columns:', requiredMapsCols.join(', '));

  const pinCols = (await dbAll("PRAGMA table_info(map_pins)")).map(c => c.name);
  const requiredPinCols = ['target_sub_map_id', 'category'];
  for (const col of requiredPinCols) {
    if (!pinCols.includes(col)) {
      throw new Error(`Missing expected column '${col}' in map_pins table! Columns found: ${pinCols.join(', ')}`);
    }
  }
  console.log('✓ map_pins table contains all required columns:', requiredPinCols.join(', '));

  const routeCols = (await dbAll("PRAGMA table_info(map_routes)")).map(c => c.name);
  const requiredRouteCols = ['id', 'map_id', 'layer_id', 'title', 'points_json', 'stroke_color', 'stroke_width', 'stroke_style', 'calculated_distance', 'is_secret'];
  for (const col of requiredRouteCols) {
    if (!routeCols.includes(col)) {
      throw new Error(`Missing expected column '${col}' in map_routes table! Columns found: ${routeCols.join(', ')}`);
    }
  }
  console.log('✓ map_routes table exists and contains all required columns.');

  // Start temporary server for HTTP API testing
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`\nTest HTTP Server listening on port ${port}`);

  const apiRequest = (method, reqPath, body = null) => new Promise((resolve, reject) => {
    const url = new URL(reqPath, baseUrl);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });

  const testMapAId = `test-map-a-${Date.now()}`;
  const testMapBId = `test-map-b-${Date.now()}`;
  const testMapCId = `test-map-c-${Date.now()}`;

  try {
    // Seed test maps: A (Root) -> B (Sub-map) -> C (Sub-sub-map)
    await dbRun(
      `INSERT INTO maps (id, world_id, title, image_path, width, height) VALUES (?, ?, ?, ?, ?, ?)`,
      [testMapAId, 'default', 'Test World Map A', '/uploads/test.png', 1920, 1080]
    );
    await dbRun(
      `INSERT INTO maps (id, world_id, parent_map_id, title, image_path, width, height) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [testMapBId, 'default', testMapAId, 'Test Kingdom Map B', '/uploads/test.png', 1920, 1080]
    );
    await dbRun(
      `INSERT INTO maps (id, world_id, parent_map_id, title, image_path, width, height) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [testMapCId, 'default', testMapBId, 'Test City Map C', '/uploads/test.png', 1920, 1080]
    );

    // 2. Hierarchy Tree Endpoint Test
    console.log('\n[2/4] Testing Hierarchy Tree API Endpoint GET /api/maps/:mapId/tree...');
    const treeRes = await apiRequest('GET', `/api/maps/${testMapCId}/tree`);
    if (treeRes.status !== 200) throw new Error(`GET /api/maps/${testMapCId}/tree returned ${treeRes.status}: ${JSON.stringify(treeRes)}`);
    const tree = treeRes.body;
    if (tree.map.id !== testMapCId) throw new Error('Tree map ID mismatch');
    if (!tree.parentMap || tree.parentMap.id !== testMapBId) throw new Error('Tree parentMap ID mismatch');
    if (!Array.isArray(tree.ancestors) || tree.ancestors.length !== 2) {
      throw new Error(`Expected 2 ancestors, got ${tree.ancestors.length}`);
    }
    if (tree.ancestors[0].id !== testMapAId || tree.ancestors[1].id !== testMapBId) {
      throw new Error('Ancestors order mismatch (should be root -> parent)');
    }
    console.log('✓ Tree endpoint correctly resolved parent and ancestors hierarchy.');

    // 3. Scale Calibration Endpoint Test
    console.log('\n[3/4] Testing Scale Calibration API Endpoint PUT /api/maps/:mapId/scale...');
    const scaleRes = await apiRequest('PUT', `/api/maps/${testMapAId}/scale`, {
      scale_pixels: 240.5,
      scale_distance: 50.0,
      scale_unit: 'leagues'
    });
    if (scaleRes.status !== 200) throw new Error(`PUT scale returned ${scaleRes.status}: ${JSON.stringify(scaleRes)}`);
    const updatedMap = scaleRes.body.map;
    if (updatedMap.scale_pixels !== 240.5 || updatedMap.scale_distance !== 50.0 || updatedMap.scale_unit !== 'leagues') {
      throw new Error(`Scale values not correctly updated: ${JSON.stringify(updatedMap)}`);
    }
    console.log('✓ Scale calibration endpoint correctly updated pixel scale & units.');

    // 4. Routes Endpoints Test
    console.log('\n[4/4] Testing Routes API Endpoints (POST, GET, DELETE)...');
    
    // Create Public Route
    const postRoute1 = await apiRequest('POST', `/api/maps/${testMapAId}/routes`, {
      title: 'King Highway',
      points_json: [{ x: 0.1, y: 0.1 }, { x: 0.5, y: 0.5 }],
      stroke_color: '#38bdf8',
      stroke_width: 4,
      stroke_style: 'solid',
      calculated_distance: 125.4,
      is_secret: 0
    });
    if (postRoute1.status !== 201) throw new Error(`POST route 1 returned ${postRoute1.status}: ${JSON.stringify(postRoute1)}`);
    const route1 = postRoute1.body.route;

    // Create Secret Route
    const postRoute2 = await apiRequest('POST', `/api/maps/${testMapAId}/routes`, {
      title: 'Smuggler Tunnel',
      points_json: [{ x: 0.2, y: 0.2 }, { x: 0.3, y: 0.3 }],
      stroke_color: '#ef4444',
      stroke_width: 2,
      stroke_style: 'dashed',
      calculated_distance: 12.0,
      is_secret: 1
    });
    if (postRoute2.status !== 201) throw new Error(`POST route 2 returned ${postRoute2.status}: ${JSON.stringify(postRoute2)}`);
    const route2 = postRoute2.body.route;

    // GET Routes (DM Mode)
    const dmRoutesRes = await apiRequest('GET', `/api/maps/${testMapAId}/routes`);
    if (dmRoutesRes.body.routes.length !== 2) throw new Error(`Expected 2 routes in DM mode, got ${dmRoutesRes.body.routes.length}`);

    // GET Routes (Player Mode)
    const playerRoutesRes = await apiRequest('GET', `/api/maps/${testMapAId}/routes?mode=player`);
    if (playerRoutesRes.body.routes.length !== 1 || playerRoutesRes.body.routes[0].id !== route1.id) {
      throw new Error(`Player mode filtering failed. Got ${playerRoutesRes.body.routes.length} routes.`);
    }
    console.log('✓ Player mode secret filtering correctly hides secret routes.');

    // DELETE Route
    const delRes = await apiRequest('DELETE', `/api/maps/${testMapAId}/routes/${route2.id}`);
    if (delRes.status !== 200 || !delRes.body.success) throw new Error('DELETE route failed');

    const finalRoutesRes = await apiRequest('GET', `/api/maps/${testMapAId}/routes`);
    if (finalRoutesRes.body.routes.length !== 1) throw new Error('Route was not deleted');
    console.log('✓ Route creation, player filtering, and deletion operating nominally.');

    console.log('\n======================================================');
    console.log('ALL ATLAS V2 BACKEND TESTS PASSED SUCCESSFULLY! 🎉');
    console.log('======================================================\n');
  } finally {
    // Cleanup test data
    await dbRun('DELETE FROM maps WHERE id IN (?, ?, ?)', [testMapAId, testMapBId, testMapCId]);
    await dbRun('DELETE FROM map_routes WHERE map_id IN (?, ?, ?)', [testMapAId, testMapBId, testMapCId]);
    server.close();
  }
}

runTests().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('\n❌ Test execution failed:', err);
  process.exit(1);
});
