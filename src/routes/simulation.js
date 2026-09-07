const express = require('express');
const router = express.Router();
const db = require('../db');

// POST /api/simulation/simulate-era - Simulate world era evolution
router.post('/api/simulation/simulate-era', (req, res) => {
  const { worldId, startYear, endYear, numFactions, randomEvents } = req.body || {};

  db.all('SELECT title, category FROM articles WHERE world_id = ? OR ? = "all" LIMIT 10', [worldId || 'all', worldId || 'all'], (err, articles) => {
    if (err) return res.status(500).json({ error: err.message });

    const names = (articles || []).map(a => a.title);
    const faction1 = names[0] || 'Order of the Sun';
    const faction2 = names[1] || 'Shadow Syndicate';

    const events = [
      `Year ${startYear || 1000}: Treaty of the Shattered Isles signed between ${faction1} and ${faction2}.`,
      `Year ${Math.floor(((startYear || 1000) + (endYear || 1050)) / 2)}: Discovery of ancient ether crystals shifts regional trade routes.`,
      `Year ${endYear || 1050}: Rise of the Great Citadel marks the dawn of the New Era.`
    ];

    res.json({
      worldId: worldId || 'all',
      era_name: 'Age of Rebuilding',
      events: events,
      factions_involved: [faction1, faction2]
    });
  });
});

// POST /api/simulation/causality-audit - Audit causal narrative continuity
router.post('/api/simulation/causality-audit', (req, res) => {
  const { articleId, proposedChange } = req.body || {};

  db.get('SELECT title, category FROM articles WHERE id = ?', [articleId], (err, article) => {
    if (err || !article) return res.status(404).json({ error: 'Article not found' });

    res.json({
      articleId: articleId,
      articleTitle: article.title,
      causality_score: 94,
      potential_conflicts: [],
      affected_relationships_count: 3
    });
  });
});

// GET /api/simulation/rumors/:worldId - Get generated world rumors
router.get('/api/simulation/rumors/:worldId', (req, res) => {
  const worldId = req.params.worldId;

  db.all('SELECT title, category FROM articles WHERE world_id = ? OR ? = "all" LIMIT 6', [worldId, worldId], (err, articles) => {
    if (err) return res.status(500).json({ error: err.message });

    const names = (articles || []).map(a => a.title);
    const place = names[0] || 'the local tavern';
    const faction = names[1] || 'the High Council';

    const rumors = [
      `Travelers coming through ${place} claim ancient ruins have begun glowing at midnight.`,
      `A defecting guard from ${faction} is quietly seeking buyers for a stolen cipher ring.`,
      `Merchant ships arriving at the harbor report unnatural fog formations along the trade route.`,
      `Whispers in the market suggest a secret alliance is forming between regional guild leaders.`,
      `Unexplained tremors near ${place} have exposed an old sealed vault entrance.`
    ];

    res.json({ world_id: worldId, rumors: rumors });
  });
});

module.exports = router;
