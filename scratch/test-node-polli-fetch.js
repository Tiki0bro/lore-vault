const fs = require('fs');
const path = require('path');

async function testServerPollinationsFetch() {
  const mapScope = 'world';
  const mapStyle = 'sepia';
  const mapTitle = 'Ancient Ruins of Aethelgard Map';
  const customPrompt = '';

  const scopePrompts = {
    world: 'Grand continental fantasy world map, vast oceans, tectonic mountain ranges, empire borders, hand-inked cartography',
    region: 'Regional province fantasy map, trade roads, rivers, kingdom borders, county fortresses',
    city: 'Top-down urban city map, district stone walls, cobblestone streets, harbor docks, market square',
    town: 'Top-down village map, rural farmlands, tavern, blacksmith, surrounding forest glade',
    treasure: 'Weathered parchment treasure map, hand-drawn X marks the spot, dotted trail path, compass rose',
    battlemap: 'Top-down tactical battlemap grid, encounter layout, ruins, glade, high contrast combat map'
  };

  const stylePrompts = {
    sepia: 'vintage sepia parchment paper, hand-inked cartography, Tolkien-style hatching, subtle aged vignetting',
    codex: 'full-color fantasy watercolor, rich emerald forests, sapphire waters, golden compass highlights',
    grimdark: 'moody dark fantasy, charcoal and granite tones, weathered parchment, obsidian rivers',
    blueprint: 'architectural blueprint, technical linework, 5ft grid overlay, crisp monochrome ink'
  };

  const polliPrompt = encodeURIComponent(`high resolution fantasy cartography map, ${scopePrompts[mapScope] || scopePrompts.world}, ${stylePrompts[mapStyle] || stylePrompts.sepia}, featuring ${mapTitle}. ${customPrompt}, detailed map, 8k resolution, no text labels, top-down perspective`);
  const polliSeed = Date.now() % 100000;
  const polliUrl = `https://image.pollinations.ai/prompt/${polliPrompt}?width=1920&height=1080&seed=${polliSeed}&model=flux&nologo=true`;

  console.log('Polli URL:', polliUrl);

  try {
    const polliRes = await fetch(polliUrl);
    console.log('Polli Status:', polliRes.status, polliRes.statusText);
    if (polliRes.ok) {
      const polliBuffer = Buffer.from(await polliRes.arrayBuffer());
      console.log('Buffer length:', polliBuffer.length);
    } else {
      const text = await polliRes.text();
      console.log('Error text:', text.substring(0, 300));
    }
  } catch (err) {
    console.error('Fetch error:', err.stack);
  }
}

testServerPollinationsFetch();
