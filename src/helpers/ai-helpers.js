const db = require('../db');

let cachedAiConfig = null;

function getAIConfig(callback) {
  if (cachedAiConfig) return callback(null, cachedAiConfig);
  db.get('SELECT * FROM ai_config WHERE id = 1', [], (err, row) => {
    if (err || !row) {
      const defaultConfig = {
        id: 1,
        active_tier: 'cloud',
        cloud_api_key: process.env.GEMINI_API_KEY || '',
        cloud_model: 'gemini-2.0-flash',
        local_endpoint: 'http://localhost:11434',
        local_model: 'llama3:8b',
        system_instruction: 'You are an elite fantasy worldbuilding companion, lore archivist, and TTRPG narrative assistant.'
      };
      return callback(null, defaultConfig);
    }
    cachedAiConfig = row;
    callback(null, row);
  });
}

function saveAIConfig(config, callback) {
  cachedAiConfig = { ...config, id: 1 };
  const query = `
    INSERT INTO ai_config (id, active_tier, cloud_api_key, cloud_model, local_endpoint, local_model, system_instruction)
    VALUES (1, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      active_tier = excluded.active_tier,
      cloud_api_key = excluded.cloud_api_key,
      cloud_model = excluded.cloud_model,
      local_endpoint = excluded.local_endpoint,
      local_model = excluded.local_model,
      system_instruction = excluded.system_instruction
  `;
  db.run(query, [config.active_tier, config.cloud_api_key, config.cloud_model, config.local_endpoint, config.local_model, config.system_instruction], function (err) {
    callback(err, cachedAiConfig);
  });
}

async function callGeminiApiWithFallback(prompt, systemInstruction = '', requestedModel = null) {
  const envKey = process.env.GEMINI_API_KEY;
  if (!envKey) {
    throw new Error('No GEMINI_API_KEY environment variable provided.');
  }

  const modelsToTry = [
    requestedModel || 'gemini-2.0-flash',
    'gemini-flash-latest',
    'gemini-1.5-flash',
    'gemini-1.5-pro'
  ].filter((v, i, a) => v && a.indexOf(v) === i);

  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${envKey}`;
      const payload = {
        contents: [{ parts: [{ text: prompt }] }]
      };
      if (systemInstruction) {
        payload.systemInstruction = { parts: [{ text: systemInstruction }] };
      }

      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        const errText = await resp.text();
        console.warn(`[Gemini API] Model ${modelName} returned status ${resp.status}. Trying next candidate...`);
        lastError = new Error(`API Error ${resp.status}: ${errText}`);
        continue;
      }

      const json = await resp.json();
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        return text;
      }
    } catch (e) {
      console.warn(`[Gemini API] Model ${modelName} encountered error: ${e.message}. Trying next candidate...`);
      lastError = e;
    }
  }

  throw lastError || new Error('All Gemini model candidates failed.');
}

function getCastPersonaContext(personaKey) {
  const personas = {
    ethen: 'Role: Product Owner. Focus: Strategic value, intuitive UX, clear presets, scope discipline.',
    riley: 'Role: QA Lead. Focus: Boundary cases, test assertions, zero silent stubs, schema integrity.',
    alex: 'Role: Full-Stack Dev. Focus: REST contracts, VTT schemas, graph performance, zero memory leaks.',
    morgan: 'Role: World Anvil Migrator. Focus: Cross-links, categories, DM secret tags, WorldAnvil formatting.',
    elena: 'Role: Novelist. Focus: Deep prose, character dynamics, narrative tension, scene realism.',
    maya: 'Role: Lead UI/UX Designer. Focus: Visual clarity, rich typography, micro-animations, theme tokens.',
    grant: 'Role: AI Novelist. Focus: Intelligent AI assistance, automatic context building, prompt craft.',
    merryn: 'Role: Craft Purist. Focus: No-generate mode, analytical consistency auditing, craft discipline.',
    marcus: 'Role: Marketing Strategist. Focus: Campaign recaps, shareable excerpts, presentation polish.',
    arthur: 'Role: Socratic Architect. Focus: 5-Whys interrogation, YAGNI, complexity tax, edge-case proof.'
  };

  return personas[personaKey] || personas.ethen;
}

function maskApiKey(key) {
  if (!key) return '';
  if (key.length <= 8) return '****';
  return key.substring(0, 4) + '...' + key.substring(key.length - 4);
}

module.exports = {
  getAIConfig,
  saveAIConfig,
  callGeminiApiWithFallback,
  getCastPersonaContext,
  maskApiKey
};
