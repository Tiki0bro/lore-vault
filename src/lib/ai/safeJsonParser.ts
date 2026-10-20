/**
 * Boundary-based JSON extractor and parser.
 * Safely extracts JSON from LLM responses even if wrapped in markdown codeblocks
 * (```json ... ```) or preceded/followed by conversational preamble.
 */
export function safeExtractJSON<T = any>(text: string, fallbackDefault?: T): T {
  if (!text || typeof text !== 'string') {
    if (fallbackDefault !== undefined) return fallbackDefault;
    throw new Error('Empty or invalid text passed to safeExtractJSON');
  }

  // 1. Try direct parsing
  try {
    return JSON.parse(text.trim());
  } catch {
    // continue to extraction
  }

  // 2. Try markdown code block extraction
  const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const match = text.match(jsonBlockRegex);
  if (match && match[1]) {
    try {
      return JSON.parse(match[1].trim());
    } catch {
      // continue to boundary search
    }
  }

  // 3. Search for outermost JSON object { ... }
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const candidate = text.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      // continue to array search
    }
  }

  // 4. Search for outermost JSON array [ ... ]
  const firstBracket = text.indexOf('[');
  const lastBracket = text.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    const candidate = text.slice(firstBracket, lastBracket + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      // continue to error/fallback
    }
  }

  if (fallbackDefault !== undefined) {
    return fallbackDefault;
  }

  throw new Error(`Failed to extract valid JSON from model response: ${text.slice(0, 150)}...`);
}
