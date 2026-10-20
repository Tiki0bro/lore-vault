import type { World, Article } from '../../types/lore';

export interface LoreContextPayload {
  world: World;
  articlesContext: string;
  isPlayerMode: boolean;
  sceneSlateArticles?: Article[];
  estimatedTokens: number;
}

export function stripHtmlAndSecrets(html: string, isPlayerMode: boolean): string {
  let cleaned = html;
  if (isPlayerMode) {
    // Strip GM secret blocks
    cleaned = cleaned.replace(/<div[^>]*class="[^"]*secret-block[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
    cleaned = cleaned.replace(/\[secret\][\s\S]*?\[\/secret\]/gi, '');
  }
  // Strip remaining HTML tags
  return cleaned.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
}

export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  // Standard heuristic: ~4 chars per token in English
  return Math.ceil(text.length / 4);
}

export function buildVaultContext(
  world: World,
  articles: Article[],
  isPlayerMode: boolean,
  query = '',
  sceneSlateIds: string[] = []
): LoreContextPayload {
  // Filter by active world and DM secret status
  const worldArticles = articles.filter((a) => a.worldId === world.id);
  const visibleArticles = worldArticles.filter((a) => !isPlayerMode || !a.isSecret);

  // Split out Scene Slate pinned articles
  const pinnedArticles = visibleArticles.filter((a) => sceneSlateIds.includes(a.id));
  const otherArticles = visibleArticles.filter((a) => !sceneSlateIds.includes(a.id));

  // If query is provided, sort other articles by relevance to query terms
  let sortedOthers = otherArticles;
  if (query.trim()) {
    const qLower = query.toLowerCase();
    sortedOthers = [...otherArticles].sort((a, b) => {
      const aScore = (a.title.toLowerCase().includes(qLower) ? 4 : 0) +
                     (a.summary.toLowerCase().includes(qLower) ? 2 : 0) +
                     (a.tags.some(t => t.toLowerCase().includes(qLower)) ? 1 : 0);
      const bScore = (b.title.toLowerCase().includes(qLower) ? 4 : 0) +
                     (b.summary.toLowerCase().includes(qLower) ? 2 : 0) +
                     (b.tags.some(t => t.toLowerCase().includes(qLower)) ? 1 : 0);
      return bScore - aScore;
    });
  }

  // Combine: pinned articles always first, followed by top relevant articles up to 12 total
  const selectedArticles = [...pinnedArticles, ...sortedOthers.slice(0, Math.max(0, 12 - pinnedArticles.length))];

  // Format articles as structured markdown for the model
  const articlesContext = selectedArticles.map((art) => {
    const isPinned = sceneSlateIds.includes(art.id);
    const textContent = stripHtmlAndSecrets(art.content, isPlayerMode);
    return `### [[${art.title}]] (${art.category})${isPinned ? ' [📌 SCENE SLATE ACTIVE]' : ''}
**Summary**: ${art.summary}
**Tags**: ${art.tags.join(', ')}
${art.isSecret ? '**Visibility**: 🔒 GM-ONLY SECRET\n' : ''}
${textContent.slice(0, 600)}...
`;
  }).join('\n---\n');

  const totalText = `${world.name} ${world.description} ${articlesContext}`;
  const estimatedTokens = estimateTokenCount(totalText);

  return {
    world,
    articlesContext,
    isPlayerMode,
    sceneSlateArticles: pinnedArticles,
    estimatedTokens,
  };
}
