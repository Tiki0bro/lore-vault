import type { IAiProvider, AiCompletionOptions, ConnectionTestResult } from './aiProviderTypes';
import { safeExtractJSON } from './safeJsonParser';

export class HeuristicProvider implements IAiProvider {
  id: 'simulation' = 'simulation';
  name = 'Built-in Scholar Heuristic Simulator';

  async generateText(prompt: string, _options?: AiCompletionOptions): Promise<string> {
    const p = prompt.toLowerCase();

    // 1. Prose Continuation Request
    if (p.includes('continue the story') || p.includes('prose continuation') || p.includes('next paragraph')) {
      return `The dust settled in long, pale ribbons through the fractured stonework. For a heartbeat, nothing stirred save the slow drip of mire water pooling in the flagstones below. 

Then came the chime—not metallic, but crystalline, shivering across the threshold like a bell cast from compressed winter. Every torch along the colonnade sputtered in unison, their amber halos turning violet in the presence of celestial resonance.

"Steady," came the whisper, quiet enough to escape the ears of whatever lingered in the crypts beneath. Fingers tightened around hilt and talisman alike.`;
    }

    // 2. Expand Beat Request
    if (p.includes('expand beat') || p.includes('convert the following outline') || p.includes('scene beat')) {
      return `The heavy oak gates gave way with a shudder that dislodged centuries of petrified moss. Beyond the threshold lay the sunken rotunda, its vaulted ceiling split down the center where the sky-shard had carved its descending arc centuries ago.

Across the chamber, shadows detached themselves from the colonnade with unsettling grace. The acolyte did not reach for steel; instead, the figure raised both palms, revealing the radiant silver runes etched deep into the marrow of each fingertip.

"You tread where even the heralds of the Silver Dawn fear to gaze," the voice echoed, vibrating with cold, unearthly certainty.`;
    }

    // 3. Sensory Polish / Style Rewrite
    if (p.includes('polish') || p.includes('sensory') || p.includes('rewrite')) {
      return `The air tasted of copper and stagnant brine, thick enough to cling to the back of the throat with every labored breath. Overhead, the cracked ribcage of the ancient vault groaned under the weight of the bog, weeping drops of mineral-heavy silt that hissed against the hot iron of the lantern cowl. In the suffocating gloom, shadows gathered like oil slicking across cold stone.`;
    }

    // 4. Worldbuilding Stub / Flesh Out Request
    if (p.includes('flesh out') || p.includes('worldbuilding entry') || p.includes('worldanvil')) {
      return `[quote]“The stars did not fall to bring us wisdom; they fell because the heavens could no longer bear their weight.” | — High Inquisitor Vaelen[/quote]

[row]
[col]
[h1]Overview[/h1]
A pivotal landmark forged during the early years following the Cataclysm. Whispers persist that the lower vaults remain locked beneath runic wards, preserved against the creeping brine of the surrounding fens.
[/col]
[col]
[h3]Archival Record[/h3]
[table]
[tr][th]Classification[/th][th]Details[/th][/tr]
[tr][td]Region[/td][td]The Weeping Fens[/td][/tr]
[tr][td]Alignment[/td][td]Neutral / Contested[/td][/tr]
[tr][td]Primary Threat[/td][td]Temporal Distortion & Inquisitor Raids[/td][/tr]
[/table]
[/col]
[/row]

[hr]

[h2]I. Historical Foundations[/h2]
Originally chronicled during the Second Reckoning, the site served as an astral sanctuary before the tides turned bitter. Chroniclers speak of great monoliths carved from meteorite alloy, capable of bending ambient light into protective wards.

[h2]II. Modern Strategic Tension[/h2]
Today, both [[High Inquisitor Vaelen]]'s inquisitorial scouting parties and independent relic-seekers compete to plumb its deepest recesses. Those who return describe echoing bronze bells and whispers in forgotten dialects.

[h2]III. Canonical Secrets & DM Hooks[/h2]
[b]The Sunken Vault:[/b] Hidden beneath the secondary foundation stones lies a sealed reliquary containing coordinates to the [[Sunshard Glaive]].`;
    }

    // 5. Statblock Request (JSON)
    if (p.includes('statblock') || p.includes('dnd5e') || p.includes('pathfinder')) {
      return JSON.stringify({
        name: "Astral Revenant",
        size: "Medium",
        creatureType: "Undead / Aberration",
        alignment: "Chaotic Neutral",
        cr: "6",
        ac: 16,
        acType: "celestial ward",
        hp: 84,
        hpFormula: "12d8 + 30",
        speed: "30 ft., fly 40 ft. (hover)",
        abilities: { str: 14, dex: 18, con: 16, int: 12, wis: 14, cha: 16 },
        actions: [
          {
            id: "act-1",
            name: "Astral Glaive Slash",
            desc: "Melee Weapon Attack: +7 to hit, reach 10 ft., one target. Hit: 14 (2d8 + 5) force damage plus 7 (2d6) radiant damage.",
            attackBonus: 7,
            formula: "1d20+7"
          },
          {
            id: "act-2",
            name: "Temporal Stasis Burst (Recharge 5-6)",
            desc: "The revenant releases a wave of temporal brine. Creatures in a 20-foot radius must make a DC 14 Wisdom saving throw or have their speed reduced to 0 until the end of their next turn.",
            formula: "DC 14"
          }
        ]
      }, null, 2);
    }

    // 6. World Doctor Diagnostic
    if (p.includes('world doctor') || p.includes('audit') || p.includes('contradiction')) {
      return JSON.stringify({
        healthScore: 92,
        executiveSummary: "The realm displays a coherent dark fantasy mythological foundation with strong thematic ties between fallen monoliths and inquisitorial crusades. Minor gaps exist between founding eras and current faction holdings.",
        contradictions: [
          {
            title: "Citadel Inundation vs Inquisitor Biography",
            description: "The Sunken Citadel flooded 300 years ago, yet archival records suggest Vaelen explored its un-submerged library during his youth.",
            severity: "medium",
            suggestedFix: "Establish that Vaelen navigated the upper bastion outposts rather than the drowned sanctum."
          }
        ],
        stubsToFleshOut: [
          {
            title: "The Bell of the Hollow Campanile",
            genre: "Dark Fantasy",
            proposedHook: "A bell cast from meteor ore whose vibrations can temporarily solidify astral rifts."
          }
        ]
      }, null, 2);
    }

    // Default conversational lore response
    return `The canonical archives reflect deep lore around this subject. Key interconnected forces include [[High Inquisitor Vaelen]] and the ancient secrets buried within [[The Sunken Citadel of Karas]]. Consider establishing how everyday travelers and factions navigate these dangerous borders.`;
  }

  async generateStructured<T>(prompt: string, fallbackDefault?: T, options?: AiCompletionOptions): Promise<T> {
    const raw = await this.generateText(prompt, { ...options, responseJsonSchema: true });
    return safeExtractJSON<T>(raw, fallbackDefault);
  }

  async testConnection(): Promise<ConnectionTestResult> {
    return {
      success: true,
      provider: 'simulation',
      model: 'Built-in Lore Heuristic',
      message: 'Heuristic Lore Engine is ready for immediate zero-key offline use.',
      sample: 'Offline scholar algorithms operational.'
    };
  }
}
