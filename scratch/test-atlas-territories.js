const http = require('http');

let port = 0;
let serverInstance = null;

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : '';
    const req = http.request({
      hostname: 'localhost',
      port: port,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataString)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(dataString);
    req.end();
  });
}

async function setupTestServer() {
  const { app } = require('../server.js');
  await new Promise((resolve) => {
    serverInstance = app.listen(0, () => {
      port = serverInstance.address().port;
      console.log(`Ephemeral test server running on port ${port}`);
      resolve();
    });
  });
}

async function runTests() {
  await setupTestServer();
  console.log('Testing Map Layers and Territories REST API endpoints...');

  const testMapId = `test-map-${Date.now()}`;

  // 1. Test GET layers (initially empty array)
  const getLayersInitRes = await makeRequest(`/api/maps/${testMapId}/layers`, 'GET');
  console.assert(getLayersInitRes.status === 200, `Expected 200 GET layers init, got ${getLayersInitRes.status}`);
  console.assert(Array.isArray(getLayersInitRes.data.layers), 'Expected layers to be an array');

  // 2. Test POST Layer creation
  const layerPayload = {
    name: 'Political Borders 3rd Era',
    color_badge: '#38bdf8',
    is_secret: 0,
    sort_order: 1
  };
  const layerRes = await makeRequest(`/api/maps/${testMapId}/layers`, 'POST', layerPayload);
  console.assert(layerRes.status === 200 || layerRes.status === 201, `Expected 200/201 POST layer, got ${layerRes.status}`);
  console.assert(layerRes.data && layerRes.data.layer, 'Expected response to contain { layer } object');
  console.assert(layerRes.data.layer.name === 'Political Borders 3rd Era', `Layer name mismatch: ${layerRes.data.layer?.name}`);
  console.assert(layerRes.data.layer.map_id === testMapId, `Layer map_id mismatch: ${layerRes.data.layer?.map_id}`);
  const createdLayerId = layerRes.data.layer.id;

  // 3. Test GET layers after creation
  const getLayersRes = await makeRequest(`/api/maps/${testMapId}/layers`, 'GET');
  console.assert(getLayersRes.status === 200, `Expected 200 GET layers, got ${getLayersRes.status}`);
  console.assert(getLayersRes.data.layers.some(l => l.id === createdLayerId), 'Created layer not found in GET response');

  // 4. Test POST Territory creation
  const territoryPayload = {
    title: 'Valorian Empire',
    layer_id: createdLayerId,
    article_id: 'art-valorian',
    points_json: JSON.stringify([[0.1, 0.1], [0.2, 0.1], [0.2, 0.2]]),
    stroke_color: '#ef4444',
    stroke_width: 3,
    stroke_style: 'solid',
    fill_color: '#ef4444',
    fill_opacity: 0.25,
    is_secret: 0
  };
  const terrRes = await makeRequest(`/api/maps/${testMapId}/territories`, 'POST', territoryPayload);
  console.assert(terrRes.status === 200 || terrRes.status === 201, `Expected 200/201 POST territory, got ${terrRes.status}`);
  console.assert(terrRes.data && terrRes.data.territory, 'Expected response to contain { territory } object');
  console.assert(terrRes.data.territory.title === 'Valorian Empire', `Territory title mismatch: ${terrRes.data.territory?.title}`);
  console.assert(terrRes.data.territory.map_id === testMapId, `Territory map_id mismatch: ${terrRes.data.territory?.map_id}`);
  const createdTerritoryId = terrRes.data.territory.id;

  // 5. Test GET territories
  const getTerrRes = await makeRequest(`/api/maps/${testMapId}/territories`, 'GET');
  console.assert(getTerrRes.status === 200, `Expected 200 GET territories, got ${getTerrRes.status}`);
  console.assert(getTerrRes.data.territories.some(t => t.id === createdTerritoryId), 'Created territory not found in GET response');

  // 6. Test PUT Territory update
  const updatePayload = {
    title: 'Valorian Empire (Updated Border)',
    fill_opacity: 0.5,
    is_contested: 1,
    contested_article_id: 'art-border-war'
  };
  const updateTerrRes = await makeRequest(`/api/maps/${testMapId}/territories/${createdTerritoryId}`, 'PUT', updatePayload);
  console.assert(updateTerrRes.status === 200, `Expected 200 PUT territory, got ${updateTerrRes.status}`);
  console.assert(updateTerrRes.data.territory.title === 'Valorian Empire (Updated Border)', `Updated title mismatch: ${updateTerrRes.data.territory?.title}`);
  console.assert(updateTerrRes.data.territory.fill_opacity === 0.5, `Updated fill_opacity mismatch: ${updateTerrRes.data.territory?.fill_opacity}`);
  console.assert(updateTerrRes.data.territory.is_contested === 1, `Updated is_contested mismatch: ${updateTerrRes.data.territory?.is_contested}`);

  // 7. Test DELETE Territory
  const delTerrRes = await makeRequest(`/api/maps/${testMapId}/territories/${createdTerritoryId}`, 'DELETE');
  console.assert(delTerrRes.status === 200, `Expected 200 DELETE territory, got ${delTerrRes.status}`);
  console.assert(delTerrRes.data.success === true, 'Expected success: true on DELETE territory');

  // 8. Test DELETE Layer
  const delLayerRes = await makeRequest(`/api/maps/${testMapId}/layers/${createdLayerId}`, 'DELETE');
  console.assert(delLayerRes.status === 200, `Expected 200 DELETE layer, got ${delLayerRes.status}`);
  console.assert(delLayerRes.data.success === true, 'Expected success: true on DELETE layer');

  console.log('✅ API Tests Passed Successfully!');

  if (serverInstance) {
    serverInstance.close();
  }
  process.exit(0);
}

runTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  if (serverInstance) serverInstance.close();
  process.exit(1);
});
