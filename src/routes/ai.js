const express = require('express');
const router = express.Router();
const db = require('../db');
const {
  getAIConfig,
  saveAIConfig,
  callGeminiApiWithFallback,
  getCastPersonaContext,
  maskApiKey
} = require('../helpers/ai-helpers');
const { filterArticleVisibility } = require('../helpers/markdown-helpers');

// GET /api/ai/config - Get AI configuration
router.get('/api/ai/config', (req, res) => {
  getAIConfig((err, config) => {
    if (err) return res.status(500).json({ error: err.message });
    const safeConfig = { ...config, cloud_api_key_masked: maskApiKey(config.cloud_api_key) };
    delete safeConfig.cloud_api_key;
    res.json(safeConfig);
  });
});

// POST /api/ai/config - Save AI configuration
router.post('/api/ai/config', (req, res) => {
  const { active_tier, cloud_api_key, cloud_model, local_endpoint, local_model, system_instruction } = req.body || {};
  getAIConfig((err, currentConfig) => {
    const newApiKey = (cloud_api_key && cloud_api_key.trim() !== '') ? cloud_api_key : (currentConfig.cloud_api_key || process.env.GEMINI_API_KEY || '');
    const updated = {
      active_tier: active_tier || currentConfig.active_tier || 'cloud',
      cloud_api_key: newApiKey,
      cloud_model: cloud_model || currentConfig.cloud_model || 'gemini-2.0-flash',
      local_endpoint: local_endpoint || currentConfig.local_endpoint || 'http://localhost:11434',
      local_model: local_model || currentConfig.local_model || 'llama3:8b',
      system_instruction: system_instruction || currentConfig.system_instruction || 'You are an elite fantasy worldbuilding companion.'
    };

    saveAIConfig(updated, (saveErr, saved) => {
      if (saveErr) return res.status(500).json({ error: saveErr.message });
      const safeConfig = { ...saved, cloud_api_key_masked: maskApiKey(saved.cloud_api_key) };
      delete safeConfig.cloud_api_key;
      res.json({ success: true, config: safeConfig });
    });
  });
});

// POST /api/ai/test-connection - Test provider readiness
router.post('/api/ai/test-connection', async (req, res) => {
  const { tier } = req.body || {};
  getAIConfig(async (err, config) => {
    const targetTier = tier || config.active_tier || 'cloud';

    if (targetTier === 'cloud') {
      const apiKey = config.cloud_api_key || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ success: false, tier: 'cloud', error: 'No Gemini API key configured.' });
      }
      try {
        const text = await callGeminiApiWithFallback('Respond with "READY".', 'Test connection ping.');
        return res.json({ success: true, tier: 'cloud', model: config.cloud_model, message: 'Gemini Cloud API connection successful!', sample: text });
      } catch (gemErr) {
        return res.status(502).json({ success: false, tier: 'cloud', error: gemErr.message });
      }
    } else {
      const endpoint = (config.local_endpoint || 'http://localhost:11434').replace(/\/$/, '');
      try {
        const resp = await fetch(`${endpoint}/api/tags`);
        if (resp.ok) {
          const data = await resp.json();
          return res.json({ success: true, tier: 'local', endpoint, models: (data.models || []).map(m => m.name) });
        } else {
          return res.status(502).json({ success: false, tier: 'local', error: `Ollama returned status ${resp.status}` });
        }
      } catch (e) {
        return res.status(502).json({ success: false, tier: 'local', error: `Cannot reach local Ollama endpoint at ${endpoint}: ${e.message}` });
      }
    }
  });
});

// POST /api/ai/assist - General AI assistance
router.post('/api/ai/assist', async (req, res) => {
  const { prompt, persona, action_type, no_generate_mode, article_context } = req.body || {};

  if (no_generate_mode) {
    return res.status(403).json({ error: 'No-Generate Mode is currently ENABLED. AI generation is blocked.' });
  }

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  getAIConfig(async (err, config) => {
    try {
      const personaContext = getCastPersonaContext(persona || 'ethen');
      const systemInst = `${config.system_instruction || ''}\n\n${personaContext}`;
      let fullPrompt = prompt;

      if (article_context) {
        fullPrompt = `[ARTICLE CONTEXT]\nTitle: ${article_context.title}\nCategory: ${article_context.category}\nContent:\n${article_context.content}\n\n[USER REQUEST]\n${prompt}`;
      }

      const reply = await callGeminiApiWithFallback(fullPrompt, systemInst, config.cloud_model);
      res.json({ reply, model: config.cloud_model, persona: persona || 'ethen' });
    } catch (gemErr) {
      res.status(500).json({ error: 'AI Generation failed: ' + gemErr.message });
    }
  });
});

// POST /api/ai/simulate-fight - AI Fight Simulator with Deterministic Dice Mechanics
router.post('/api/ai/simulate-fight', async (req, res) => {
  try {
    const { combatant_a, combatant_b, party_a, party_b, environment, tone_preset, generate_prose } = req.body || {};

    const teamA = Array.isArray(party_a) && party_a.length > 0 ? party_a : [combatant_a || {}];
    const teamB = Array.isArray(party_b) && party_b.length > 0 ? party_b : [combatant_b || {}];

    const rosterA = teamA.map((c, idx) => ({
      name: c.name || `Combatant A${idx + 1}`,
      hp: parseInt(c.hp) || 30,
      max_hp: parseInt(c.hp) || 30,
      ac: parseInt(c.ac) || 14,
      attack_bonus: parseInt(c.attack_bonus) || 4,
      damage_dice: c.damage_dice || '1d8+2',
      special_ability: c.special_ability || null
    }));

    const rosterB = teamB.map((c, idx) => ({
      name: c.name || `Combatant B${idx + 1}`,
      hp: parseInt(c.hp) || 30,
      max_hp: parseInt(c.hp) || 30,
      ac: parseInt(c.ac) || 14,
      attack_bonus: parseInt(c.attack_bonus) || 4,
      damage_dice: c.damage_dice || '1d8+2',
      special_ability: c.special_ability || null
    }));

    const rollDie = (sides) => {
      const crypto = require('crypto');
      const array = new Uint32Array(1);
      crypto.randomFillSync(array);
      return (array[0] % sides) + 1;
    };

    const parseAndRollDamage = (diceStr, isCrit = false) => {
      let numDice = 1;
      let sides = 6;
      let mod = 0;
      const clean = (diceStr || '1d6').toLowerCase().replace(/\s+/g, '');
      if (clean.includes('d')) {
        const parts = clean.split('d');
        numDice = parseInt(parts[0]) || 1;
        const subParts = parts[1].split(/[\+\-]/);
        sides = parseInt(subParts[0]) || 6;
        if (parts[1].includes('+')) mod = parseInt(parts[1].split('+')[1]) || 0;
        if (parts[1].includes('-')) mod = -(parseInt(parts[1].split('-')[1]) || 0);
      }
      let total = 0;
      const rolls = [];
      const count = isCrit ? numDice * 2 : numDice;
      for (let i = 0; i < count; i++) {
        const r = rollDie(sides);
        rolls.push(r);
        total += r;
      }
      total += mod;
      return { total: Math.max(1, total), rolls, mod, formula: diceStr };
    };

    let round = 1;
    const turnLog = [];

    while (round <= 30) {
      const livingA = rosterA.filter(c => c.hp > 0);
      const livingB = rosterB.filter(c => c.hp > 0);

      if (livingA.length === 0 || livingB.length === 0) break;

      livingA.forEach(attacker => {
        const livingTargets = rosterB.filter(c => c.hp > 0);
        if (livingTargets.length === 0) return;
        const target = livingTargets[0];

        const d20 = rollDie(20);
        const totalAtk = d20 + attacker.attack_bonus;
        const isNat20 = d20 === 20;

        if (isNat20 || totalAtk >= target.ac) {
          const useAbility = attacker.special_ability && (attacker.hp / attacker.max_hp <= 0.5 || rollDie(10) > 7);
          const dmgDice = useAbility ? attacker.special_ability.damage_dice : attacker.damage_dice;
          const dmgResult = parseAndRollDamage(dmgDice, isNat20);

          target.hp = Math.max(0, target.hp - dmgResult.total);
          turnLog.push({
            round,
            attacker: attacker.name,
            defender: target.name,
            d20_roll: d20,
            total_attack: totalAtk,
            target_ac: target.ac,
            hit: true,
            is_crit: isNat20,
            used_ability: useAbility ? attacker.special_ability.name : null,
            damage_dealt: dmgResult.total,
            defender_hp_remaining: target.hp
          });
        } else {
          turnLog.push({
            round,
            attacker: attacker.name,
            defender: target.name,
            d20_roll: d20,
            total_attack: totalAtk,
            target_ac: target.ac,
            hit: false,
            damage_dealt: 0,
            defender_hp_remaining: target.hp
          });
        }
      });

      livingB.forEach(attacker => {
        const livingTargets = rosterA.filter(c => c.hp > 0);
        if (livingTargets.length === 0) return;
        const target = livingTargets[0];

        const d20 = rollDie(20);
        const totalAtk = d20 + attacker.attack_bonus;
        const isNat20 = d20 === 20;

        if (isNat20 || totalAtk >= target.ac) {
          const useAbility = attacker.special_ability && (attacker.hp / attacker.max_hp <= 0.5 || rollDie(10) > 7);
          const dmgDice = useAbility ? attacker.special_ability.damage_dice : attacker.damage_dice;
          const dmgResult = parseAndRollDamage(dmgDice, isNat20);

          target.hp = Math.max(0, target.hp - dmgResult.total);
          turnLog.push({
            round,
            attacker: attacker.name,
            defender: target.name,
            d20_roll: d20,
            total_attack: totalAtk,
            target_ac: target.ac,
            hit: true,
            is_crit: isNat20,
            used_ability: useAbility ? attacker.special_ability.name : null,
            damage_dealt: dmgResult.total,
            defender_hp_remaining: target.hp
          });
        } else {
          turnLog.push({
            round,
            attacker: attacker.name,
            defender: target.name,
            d20_roll: d20,
            total_attack: totalAtk,
            target_ac: target.ac,
            hit: false,
            damage_dealt: 0,
            defender_hp_remaining: target.hp
          });
        }
      });

      round++;
    }

    const survivingA = rosterA.filter(c => c.hp > 0);
    const survivingB = rosterB.filter(c => c.hp > 0);
    let winnerName = 'Draw / Stalemate';

    if (survivingA.length > 0 && survivingB.length === 0) {
      winnerName = rosterA.length === 1 ? rosterA[0].name : 'Party A';
    } else if (survivingB.length > 0 && survivingA.length === 0) {
      winnerName = rosterB.length === 1 ? rosterB[0].name : 'Party B';
    }

    const summaryText = `Battle concluded in ${round - 1} rounds. Winner: ${winnerName}.`;

    let proseText = summaryText;

    if (generate_prose !== false) {
      try {
        const prompt = `Write a dramatic combat narrative for a duel taking place at ${environment || 'Midnight Ramparts'}.\nWinner: ${winnerName}\nTurn-by-turn dice logs:\n${JSON.stringify(turnLog.slice(0, 15), null, 2)}`;
        proseText = await callGeminiApiWithFallback(prompt, 'You are an epic fantasy battle narrator.');
      } catch (gemErr) {
        proseText = `[Deterministic Log Summary]\n${summaryText}\n(AI prose synthesis skipped: ${gemErr.message})`;
      }
    }

    res.json({
      success: true,
      winner: winnerName,
      total_rounds: round - 1,
      mechanics_summary: summaryText,
      narrative_prose: proseText,
      turn_log: turnLog
    });
  } catch (err) {
    res.status(500).json({ error: 'Fight simulation failed: ' + err.message });
  }
});

// POST /api/concierge/route-intent - AI Journey Concierge Router
router.post('/api/concierge/route-intent', (req, res) => {
  const { query } = req.body || {};
  if (!query) return res.status(400).json({ error: 'Query string is required' });

  const clean = query.toLowerCase();

  if (clean.includes('map') || clean.includes('atlas') || clean.includes('pin')) {
    return res.json({ target_tab: 'atlas', action: 'open_atlas', message: 'Opening World Atlas Map Studio...' });
  } else if (clean.includes('timeline') || clean.includes('date') || clean.includes('history')) {
    return res.json({ target_tab: 'timeline', action: 'open_timeline', message: 'Opening World Chronology & Timeline...' });
  } else if (clean.includes('fight') || clean.includes('battle') || clean.includes('duel')) {
    return res.json({ target_tab: 'tools', action: 'open_fight_simulator', message: 'Launching AI Fight Simulator...' });
  } else if (clean.includes('template')) {
    return res.json({ target_tab: 'tools', action: 'open_template_builder', message: 'Launching Article Template Builder...' });
  }

  return res.json({ target_tab: 'frontpage', action: 'open_search', message: `Routing search query for: ${query}` });
});

module.exports = router;
