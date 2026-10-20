import type { TonePreset, ArticleCategory } from '../../types/lore';

export const promptTemplates = {
  getToneGuidance(tone?: TonePreset): string {
    switch (tone) {
      case 'grimdark':
        return 'Tone: Gritty, visceral, morally ambiguous, sensory-heavy, visceral consequences, high tension.';
      case 'high_fantasy':
        return 'Tone: Grand, epic, lyrical, steeped in wonder, ancient myth, and chivalric nobility.';
      case 'scifi':
        return 'Tone: Tech-savvy, speculative, atmospheric, neon-drenched, sleek, philosophical.';
      case 'gothic':
        return 'Tone: Melancholic, claustrophobic, decadent, psychological dread, decaying grandeur.';
      case 'academic':
        return 'Tone: Formal, archivist-scholar, encyclopedic, objective, annotated.';
      case 'mythic':
        return 'Tone: Biblical, timeless, legendary, grand allegorical imagery.';
      default:
        return 'Tone: Immersive, polished fantasy with rich sensory depth.';
    }
  },

  fleshOutArticleStub(params: {
    title: string;
    category: ArticleCategory;
    summary: string;
    worldName: string;
    worldGenre: string;
    existingArticlesContext: string;
    tone?: TonePreset;
    noGenerateMode?: boolean;
  }): { systemPrompt: string; userPrompt: string } {
    const toneGuide = this.getToneGuidance(params.tone);

    if (params.noGenerateMode) {
      return {
        systemPrompt: 'You are a craft purist worldbuilding architect. You generate structured templates and prompting questions ONLY. Do not write creative prose.',
        userPrompt: `Generate a structured WorldAnvil-style article outline for "${params.title}" (${params.category}) in "${params.worldName}". Include sections, bulleted prompt questions to help the author write, and table templates.`
      };
    }

    const systemPrompt = `You are the master worldbuilding archivist for "${params.worldName}" (Genre: ${params.worldGenre}).
${toneGuide}
Formatting Rules:
1. Always begin with a thematic quote: [quote]“Quote text” | — Speaker Name[/quote]
2. Structure header:
[row]
[col]
[h1]Overview[/h1]
Core summary paragraph.
[/col]
[col]
[h3]Attributes[/h3]
[table]
[tr][th]Key[/th][th]Value[/th][/tr]
[/table]
[/col]
[/row]
3. Divide sections with [hr] and [h2]I. Section Name[/h2]
4. Reference canonical entities using [[Entity Name]] so they become interactive links.
5. Include 1 secret or GM adventure hook at the end under [b]DM Secret / Hook:[/b].`;

    const userPrompt = `Flesh out the lore entry for "${params.title}" (Category: ${params.category}).
Current Summary / Notes: ${params.summary || 'None provided.'}

Known Realm Context:
${params.existingArticlesContext}

Generate the full comprehensive WorldAnvil canonical entry now.`;

    return { systemPrompt, userPrompt };
  },

  proseContinuation(params: {
    chapterTitle: string;
    precedingText: string;
    povCharacter?: string;
    tone?: TonePreset;
    sceneSlateContext?: string;
    customDirection?: string;
  }): { systemPrompt: string; userPrompt: string } {
    const toneGuide = this.getToneGuidance(params.tone);

    const systemPrompt = `You are an elite fantasy novelist co-writing a manuscript chapter titled "${params.chapterTitle}".
${toneGuide}
${params.povCharacter ? `POV Character: ${params.povCharacter}. Filter all thoughts and sensory impressions through this character's mindset.` : ''}
${params.sceneSlateContext ? `\nActive Scene Lore Slate (Must respect these canonical entities):\n${params.sceneSlateContext}` : ''}

Rules:
1. Continue seamlessly from the exact narrative flow of the preceding text.
2. Advance the scene with natural dialogue, physical actions, and sensory resonance.
3. Write 2-3 engaging, tightly woven paragraphs. Do not add meta-commentary.`;

    const userPrompt = `Preceding narrative excerpt:
"""
${params.precedingText.slice(-1800)}
"""
${params.customDirection ? `\nAuthor Directive: ${params.customDirection}` : ''}

Write the next continuation paragraphs now:`;

    return { systemPrompt, userPrompt };
  },

  expandBeat(params: {
    chapterTitle: string;
    outlineBeat: string;
    tone?: TonePreset;
    sceneSlateContext?: string;
  }): { systemPrompt: string; userPrompt: string } {
    const toneGuide = this.getToneGuidance(params.tone);

    const systemPrompt = `You are a master fiction novelist. Your task is to expand an outline beat into a full, vivid scene.
${toneGuide}
${params.sceneSlateContext ? `\nActive Scene Lore Slate:\n${params.sceneSlateContext}` : ''}
Focus on sensory texture (sound, light, texture, temperature), emotional subtext, and pacing.`;

    const userPrompt = `Expand this outline beat into full scene prose for chapter "${params.chapterTitle}":
Beat / Notes:
"""
${params.outlineBeat}
"""

Generate the fully rendered scene:`;

    return { systemPrompt, userPrompt };
  },

  sensoryPolish(params: {
    rawText: string;
    tone?: TonePreset;
    focus: 'sensory' | 'punchy' | 'dialogue' | 'grimdark';
  }): { systemPrompt: string; userPrompt: string } {
    const systemPrompt = `You are a senior line editor polishing fiction prose.
Focus: ${params.focus === 'sensory' ? 'Amplify physical textures, olfactory cues, soundscapes, and lighting.' :
       params.focus === 'punchy' ? 'Trim adverb bloat, tighten sentence rhythm, increase tension.' :
       params.focus === 'dialogue' ? 'Sharpen verbal subtext, rhythm, and distinct character voices.' :
       'Deepen grimdark mood, visceral stakes, and ominous atmospheric decay.'}`;

    const userPrompt = `Polish this prose passage without altering the plot events:
"""
${params.rawText}
"""

Polished passage:`;

    return { systemPrompt, userPrompt };
  },

  statblockConversion(params: {
    creatureConcept: string;
    system: 'dnd5e' | 'pf2e';
    crTarget?: string;
    loreContext?: string;
  }): { systemPrompt: string; userPrompt: string } {
    const systemPrompt = `You are an expert TTRPG designer specializing in balanced monster statblocks for ${params.system === 'dnd5e' ? 'Dungeons & Dragons 5e' : 'Pathfinder 2e'}.
You MUST return valid JSON adhering to the exact schema requested.`;

    const userPrompt = `Create a complete statblock for:
Concept: ${params.creatureConcept}
Target CR: ${params.crTarget || '5'}
System: ${params.system}
${params.loreContext ? `Lore Context: ${params.loreContext}` : ''}

Return JSON with this exact schema:
{
  "name": "string",
  "size": "Small | Medium | Large | Huge | Gargantuan",
  "creatureType": "string",
  "alignment": "string",
  "cr": "string",
  "ac": number,
  "acType": "string (e.g. natural armor)",
  "hp": number,
  "hpFormula": "string (e.g. 10d8+30)",
  "speed": "string",
  "abilities": { "str": number, "dex": number, "con": number, "int": number, "wis": number, "cha": number },
  "actions": [
    { "id": "act-1", "name": "string", "desc": "string", "attackBonus": number, "formula": "string" }
  ]
}`;

    return { systemPrompt, userPrompt };
  },

  npcRoleplay(params: {
    npcName: string;
    npcLore: string;
    worldName: string;
    dialogueHistory: Array<{ speaker: string; text: string }>;
    userMessage: string;
  }): { systemPrompt: string; userPrompt: string } {
    const systemPrompt = `You are roleplaying as the in-universe character "${params.npcName}" in the realm of "${params.worldName}".
Canonical character profile:
${params.npcLore}

Guidelines:
1. Stay strictly in character. Reflect your personality quirks, motivations, biases, and speech cadence.
2. Keep replies natural and dialogue-driven (1-3 paragraphs).
3. Do not break character or speak as an AI assistant.`;

    const formattedHistory = params.dialogueHistory.map(m => `${m.speaker}: ${m.text}`).join('\n');
    const userPrompt = `${formattedHistory}\nVisitor: ${params.userMessage}\n${params.npcName}:`;

    return { systemPrompt, userPrompt };
  },

  fightSimulationProse(params: {
    combatantA: string;
    combatantB: string;
    winner: string;
    rounds: number;
    turnLogs: string;
    environment?: string;
  }): { systemPrompt: string; userPrompt: string } {
    const systemPrompt = `You are an epic fantasy battle chronicler. You turn tactical dice combat logs into gripping, blow-by-blow narrative fight prose for a novel chapter.`;
    const userPrompt = `Write a dramatic combat sequence for a clash at ${params.environment || 'the Shadowed Ramparts'}.
Combatants: ${params.combatantA} vs. ${params.combatantB}
Concluded in: ${params.rounds} rounds
Victor: ${params.winner}

Tactical dice turn logs:
${params.turnLogs}

Generate the novel combat scene ready to append to a chapter:`;

    return { systemPrompt, userPrompt };
  }
};
