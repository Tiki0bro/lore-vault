import type { ArticleCategory } from '../../types/lore';

export interface PromptFacetRequirement {
  id: string;
  label: string;
  placeholder: string;
  examples: string[];
  description: string;
  // Keywords or regex pattern to detect if prompt already mentions this
  matcher: RegExp;
}

export interface CategoryPromptSchema {
  category: ArticleCategory;
  categoryLabel: string;
  description: string;
  requirements: PromptFacetRequirement[];
  recommendedComposition: string[];
}

export const CATEGORY_PROMPT_SCHEMAS: Record<ArticleCategory, CategoryPromptSchema> = {
  Character: {
    category: 'Character',
    categoryLabel: 'Character / Person of Note',
    description: 'Viable character portraits require racial lineage, gender identity, distinctive hair/features, attire, and gear.',
    requirements: [
      {
        id: 'race',
        label: 'Race / Ancestry',
        placeholder: 'e.g. Elf, Human, Dwarf, Tiefling, Android, Draconic humanoid',
        examples: ['High Elf', 'Weathered Human', 'Mountain Dwarf', 'Cybernetic Cyborg', 'Draconian'],
        description: 'Species, fantasy lineage, or biological origin',
        matcher: /\b(human|elf|elven|dwarf|dwarven|orc|orcish|tiefling|halfling|gnome|android|cyborg|draconic|dragonborn|fey|goblin|undead|vampire|fae|beastfolk)\b/i,
      },
      {
        id: 'gender',
        label: 'Gender / Presentation',
        placeholder: 'e.g. Male, Female, Androgynous warrior, Matriarch',
        examples: ['Male', 'Female', 'Androgynous', 'Elder matriarch', 'Young prince'],
        description: 'Gender expression or character archetype',
        matcher: /\b(man|woman|male|female|guy|girl|warrior|matriarch|patriarch|lord|lady|hero|heroine|androgynous|knight|scholar|priest|priestess|inquisitor|sorcerer|sorceress|mage|king|queen|prince|princess)\b/i,
      },
      {
        id: 'hair',
        label: 'Hair / Facial Features',
        placeholder: 'e.g. Braided silver hair, shaved head with golden runes, scarred jaw',
        examples: ['Braided raven hair', 'Silver-white mane', 'Shaved head with glowing tattoo', 'Tangled amber locks'],
        description: 'Hair color, hairstyle, beard, horns, or signature facial features',
        matcher: /\b(hair|mane|beard|locks|braids|braided|bald|shaved|curls|tresses|horns|scarred|eyes|gaze|jaw)\b/i,
      },
      {
        id: 'clothes',
        label: 'Attire & Gear',
        placeholder: 'e.g. Gilded ceremonial plate armor, velvet scholar robes, leather tunic',
        examples: ['Gilded plate armor', 'Midnight velvet hooded cloak', 'Runed breastplate', 'Weathered traveler leathers'],
        description: 'Armor, garments, clothing fabrics, robes, or regalia',
        matcher: /\b(armor|armour|clothes|clothing|cloak|robes|tunic|vestments|plate|leather|garments|chainmail|gown|mantle|attire|regalia|cuirass)\b/i,
      },
      {
        id: 'equipment',
        label: 'Held Item / Pose',
        placeholder: 'e.g. Wielding an obsidian longsword, holding an ancient scroll, hands glowing with embers',
        examples: ['Wielding a runic greatsword', 'Grasping an alchemical hourglass', 'Hands crackling with lightning'],
        description: 'Weapon, staff, tome, relic, or pose demeanor',
        matcher: /\b(wielding|holding|clutching|sword|staff|blade|dagger|bow|shield|orb|tome|grimoire|lantern|glaive|hammer|wand|relic|hands|pose|stance)\b/i,
      },
    ],
    recommendedComposition: ['Character Portrait', 'Dramatic Rim Lighting', 'Intricate Clothing Details', 'Expressive Gaze'],
  },

  Location: {
    category: 'Location',
    categoryLabel: 'Realm Location / Vista',
    description: 'Viable location panoramas need architectural style, geographic terrain, atmospheric weather, and illumination/time of day.',
    requirements: [
      {
        id: 'architecture',
        label: 'Landmark / Architecture',
        placeholder: 'e.g. Floating gothic citadel, sunken obsidian ruins, subterranean dwarven metropolis',
        examples: ['Gothic spires and bridges', 'Sunken marble acropolis', 'Ancient overgrown temple', 'Brutalist fortress'],
        description: 'Core structures, ruins, monuments, or settlement architecture',
        matcher: /\b(citadel|fortress|temple|ruins|castle|tower|spires|city|cathedral|sanctuary|stronghold|palace|acropolis|bridge|gate|colonnade|monolith|settlement)\b/i,
      },
      {
        id: 'environment',
        label: 'Biome / Terrain',
        placeholder: 'e.g. Jagged volcanic caldera, misty pine valley, frozen glacier abyss',
        examples: ['Mist-shrouded mountain pass', 'Bioluminescent fungal cavern', 'Arid desert dunes', 'Ancient primordial forest'],
        description: 'Geological surroundings, biome, flora, and landscape',
        matcher: /\b(mountain|forest|valley|cavern|swamp|desert|canyon|caldera|ocean|sea|river|cliffs|tundra|marsh|woods|crags|abyss|plains)\b/i,
      },
      {
        id: 'lighting_mood',
        label: 'Weather & Illumination',
        placeholder: 'e.g. Twin moons glowing through storm clouds, sunset god rays, dense ethereal fog',
        examples: ['Dramatic twilight aurora', 'Volcanic ember haze', 'Golden hour god rays', 'Distant thunderstorm lightning'],
        description: 'Atmospheric conditions, weather, sky, and light source',
        matcher: /\b(light|lighting|sky|clouds|storm|fog|mist|sunset|twilight|aurora|moonlight|sunlight|god rays|haze|rain|snow|shadows|glow)\b/i,
      },
      {
        id: 'scale',
        label: 'Scale & Composition',
        placeholder: 'e.g. Massive sweeping panorama, bird-eye perspective, monolithic proportions',
        examples: ['Grand monumental scale', 'Expansive panoramic vista', 'Low-angle majestic composition'],
        description: 'Perspective and sense of grand proportion',
        matcher: /\b(panorama|panoramic|vista|wide angle|wide shot|monumental|colossal|vast|epic scale|sweeping|aerial|horizon)\b/i,
      },
    ],
    recommendedComposition: ['Wide Panoramic Vista', 'Cinematic Atmosphere', 'Atmospheric Depth', 'Grand Architectural Scale'],
  },

  Faction: {
    category: 'Faction',
    categoryLabel: 'Faction / Order / Clan',
    description: 'Viable faction depictions require banner heraldry/colors, uniform insignia, typical member role, and environment/headquarters.',
    requirements: [
      {
        id: 'heraldry',
        label: 'Colors & Heraldry',
        placeholder: 'e.g. Scarlet and black silk standards with an eclipsed silver sun sigil',
        examples: ['Crimson and gold dragon banner', 'Obsidian flag with raven skull', 'Cerulean pennants with lightning crest'],
        description: 'Faction colors, emblems, flags, crests, and heraldic banners',
        matcher: /\b(banner|standard|flag|crest|sigil|insignia|emblem|heraldry|colors|colours|heraldic|pennant|symbol)\b/i,
      },
      {
        id: 'troop_type',
        label: 'Troop / Member Archetype',
        placeholder: 'e.g. Heavily armored paladins, hooded assassin inquisitors, arcane battle-mages',
        examples: ['Stealthy hooded operatives', 'Elite armored vanguard', 'Robed guild artificers'],
        description: 'The archetype of the people representing the faction',
        matcher: /\b(legion|soldiers|warriors|paladins|knights|inquisitors|scholars|mercenaries|guards|monks|cultists|sentinels|vanguard|operatives)\b/i,
      },
      {
        id: 'formation',
        label: 'Setting / Formation',
        placeholder: 'e.g. Assembled in disciplined rank-and-file within a vaulted war room',
        examples: ['Arrayed in battle formation', 'Gathered around a war council map table', 'Marching through a citadel gate'],
        description: 'Demeanor, formation, gathering context, or stronghold backdrop',
        matcher: /\b(formation|ranks|assembled|marching|council|chamber|fortress|camp|standing|gathered|parade|courtyard)\b/i,
      },
    ],
    recommendedComposition: ['Heraldic Banners', 'Regimental Formation', 'Solemn Atmosphere', 'High Contrast Chiaroscuro'],
  },

  Item: {
    category: 'Item',
    categoryLabel: 'Artifact / Relic / Weapon',
    description: 'Viable relic depictions require primary material, magical aura/runes, condition/age, and presentation display.',
    requirements: [
      {
        id: 'material',
        label: 'Forging Material',
        placeholder: 'e.g. Damascus meteoritic steel, carved dragonbone, polished lapis lazuli',
        examples: ['Celestial meteoric iron', 'Ancient polished obsidian', 'Carved elderwood and brass', 'Adamantine alloy'],
        description: 'The physical substance the relic is crafted from',
        matcher: /\b(steel|iron|gold|silver|bronze|brass|wood|bone|obsidian|crystal|glass|stone|adamantine|mithril|leather|gemstone|ruby|emerald|sapphire|metal)\b/i,
      },
      {
        id: 'aura_magic',
        label: 'Magical Aura / Engravings',
        placeholder: 'e.g. Etched with glowing violet glyphs, humming with faint amber ether sparks',
        examples: ['Glowing azure runes', 'Wisps of dark void smoke', 'Ethereal golden luminescence', 'Inlaid silver filigree'],
        description: 'Runes, magical glows, ether particles, or engravings',
        matcher: /\b(glowing|runes|glyphs|engraved|inlaid|filigree|aura|sparks|luminescence|glow|smoke|energy|magic|enchanted|ether)\b/i,
      },
      {
        id: 'display',
        label: 'Presentation / Mount',
        placeholder: 'e.g. Resting on dark crushed velvet inside a locked reliquary, levitating above an altar',
        examples: ['Resting on weathered stone pedestal', 'Suspended in zero gravity', 'Displayed on dark velvet cushion'],
        description: 'Altar, pedestal, display cushion, or lighting frame',
        matcher: /\b(altar|pedestal|stand|cushion|velvet|display|floating|levitating|resting|table|reliquary|shelf|pedestal|studio lighting|blueprint)\b/i,
      },
    ],
    recommendedComposition: ['Close-up Macro Focus', 'Subtle Arcane Glow', 'Textured Materials', 'Dramatic Shadowing'],
  },

  Event: {
    category: 'Event',
    categoryLabel: 'Historical Event / Cataclysm',
    description: 'Viable event scenes require focal action, opposing forces/factions, environmental devastation, and emotional mood.',
    requirements: [
      {
        id: 'focal_action',
        label: 'Climactic Action',
        placeholder: 'e.g. The shattering of the World Bell atop the high tower',
        examples: ['The crowning of the usurper', 'A catastrophic breach of the containment runes', 'The desperate charge of the vanguard'],
        description: 'The decisive moment occurring in the scene',
        matcher: /\b(battle|clash|shattering|collapse|coronation|siege|charge|ritual|cataclysm|breach|eruption|duel|confrontation|fall of|strike)\b/i,
      },
      {
        id: 'participants',
        label: 'Key Participants',
        placeholder: 'e.g. High Inquisitor confronting the rebel Arch-Mage amidst screaming crowds',
        examples: ['Two champion duelists', 'Armies colliding in snow', 'Priests channeling a desperate seal'],
        description: 'Who is involved in the confrontation or historic milestone',
        matcher: /\b(armies|warriors|champion|inquisitor|mage|monarch|crowds|cultists|combatants|defenders|invaders|duelists)\b/i,
      },
      {
        id: 'devastation_mood',
        label: 'Environment & Tone',
        placeholder: 'e.g. Burning sky raining ash, crumbling stonework, tragic solemn mood',
        examples: ['Rain-drenched bloodstained courtyard', 'Sky illuminated by arcane blast', 'Smoking ruins under eclipse'],
        description: 'Weather, destruction, collateral effects, and atmosphere',
        matcher: /\b(smoke|fire|flames|ash|blood|rain|ruins|wreckage|sparks|debris|crater|chaos|somber|tragic|epic|monumental)\b/i,
      },
    ],
    recommendedComposition: ['Dynamic Cinematic Frame', 'Epochal Scale', 'Dramatic Contrast', 'Kinetic Motion Blur'],
  },

  Lore: {
    category: 'Lore',
    categoryLabel: 'General Lore / Mystery',
    description: 'Viable lore scenes need a clear core subject, thematic symbolism, atmospheric setting, and rich texture.',
    requirements: [
      {
        id: 'subject',
        label: 'Core Subject',
        placeholder: 'e.g. An ancient celestial astrolabe tracking wandering stars',
        examples: ['Ancient constellation map', 'Sealed tomb door with forbidden ward', 'Monolithic stone tablet with prophecy'],
        description: 'The central entity, phenomenon, or mystery being documented',
        matcher: /\b(map|tomb|tablet|phenomenon|prophecy|sigil|astrolabe|grimoire|monolith|entity|tree|spring|sanctum|monument|relic|creature|phenomena)\b/i,
      },
      {
        id: 'setting',
        label: 'Atmospheric Realm Setting',
        placeholder: 'e.g. Inside the sunken library of the High Scholars beneath the tide',
        examples: ['Deep inside an abandoned crypt', 'Under the twin blood moons', 'In the candlelit archival vault'],
        description: 'Where this lore takes place or is safeguarded',
        matcher: /\b(library|vault|crypt|temple|chamber|sanctum|underground|ruins|hall|realm|shrine|catacombs|sanctuary)\b/i,
      },
      {
        id: 'mood',
        label: 'Tone & Atmosphere',
        placeholder: 'e.g. Ominous, ancient, reverent silence, golden candlelight with deep shadows',
        examples: ['Eerie quietude', 'Gilded ancient reverence', 'Dark occult mystique'],
        description: 'Sensory mood, lighting contrast, and mystical atmosphere',
        matcher: /\b(ancient|mysterious|reverent|ominous|shadows|candlelight|chilling|mystical|solemn|grand|atmospheric|textured)\b/i,
      },
    ],
    recommendedComposition: ['Atmospheric Chiaroscuro', 'Aged Texture', 'Evocative Depth', 'Masterpiece Painting'],
  },
};

/**
 * Validates a prompt against category requirements.
 * Returns completeness score (0-100), missing requirements, and suggested fixes.
 */
export function validatePromptCompleteness(
  prompt: string,
  category: ArticleCategory = 'Character'
): {
  isComplete: boolean;
  score: number; // 0 - 100
  totalCount: number;
  metCount: number;
  metIds: string[];
  missing: PromptFacetRequirement[];
  schema: CategoryPromptSchema;
} {
  const schema = CATEGORY_PROMPT_SCHEMAS[category] || CATEGORY_PROMPT_SCHEMAS.Character;
  const cleaned = prompt.trim();

  if (!cleaned) {
    return {
      isComplete: false,
      score: 0,
      totalCount: schema.requirements.length,
      metCount: 0,
      metIds: [],
      missing: schema.requirements,
      schema,
    };
  }

  const metIds: string[] = [];
  const missing: PromptFacetRequirement[] = [];

  for (const req of schema.requirements) {
    if (req.matcher.test(cleaned)) {
      metIds.push(req.id);
    } else {
      missing.push(req);
    }
  }

  const metCount = metIds.length;
  const totalCount = schema.requirements.length;
  const score = Math.round((metCount / totalCount) * 100);
  // Complete if all required facets are covered
  const isComplete = missing.length === 0;

  return {
    isComplete,
    score,
    totalCount,
    metCount,
    metIds,
    missing,
    schema,
  };
}

/**
 * Helper to append a missing facet directly into a user's prompt text cleanly
 */
export function injectFacetIntoPrompt(existingPrompt: string, snippet: string): string {
  const trimmed = existingPrompt.trim().replace(/[,\s]+$/, '');
  if (!trimmed) return snippet;
  return `${trimmed}, ${snippet}`;
}
