function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function stripNoise(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<!--([\s\S]*?)-->/g, '')
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, '')
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '');
}

function pickMainContent(html: string): string {
  // Greedy matching for semantic block elements that are rarely nested — this ensures we
  // capture the full container content rather than stopping at the first nested closing tag.
  const greedySelectors: RegExp[] = [
    /<[^>]+itemprop=["']articleBody["'][^>]*>([\s\S]*)<\/(?:div|section|article)>/i,
    /<article\b[^>]*>([\s\S]*)<\/article>/i,
    /<main\b[^>]*>([\s\S]*)<\/main>/i,
  ];

  for (const selector of greedySelectors) {
    const match = html.match(selector);
    if (match?.[1] && match[1].length > 50) return match[1];
  }

  // For div-based containers, regex cannot track nesting depth — find the opening tag and
  // slice a generous chunk so nested divs don't cause early termination.
  const divPatterns: RegExp[] = [
    /<div[^>]+id=["'][^"']*(?:article|story|content|main)[^"']*["'][^>]*>/i,
    /<div[^>]+class=["'][^"']*(?:article-body|article-content|entry-content|post-content|story-body|article-text|news-content|field-body|node-content)[^"']*["'][^>]*>/i,
  ];

  for (const pattern of divPatterns) {
    const match = html.match(pattern);
    if (match) {
      const start = match.index! + match[0].length;
      const chunk = html.slice(start, start + 60_000);
      if (chunk.length > 50) return chunk;
    }
  }

  return html;
}

function htmlToText(html: string): string {
  const withBreaks = html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|section|article|h1|h2|h3|h4|h5|h6|li)>/gi, '\n\n')
    .replace(/<\s*li\b[^>]*>/gi, '\n- ');

  return decodeEntities(
    withBreaks
      .replace(/<[^>]+>/g, ' ')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\n[ \t]*/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
  );
}

export function extractArticleTextFromHtml(html: string): string {
  const cleaned = stripNoise(html);
  const main = pickMainContent(cleaned);
  const text = htmlToText(main);

  const paragraphs = text
    .split('\n\n')
    .map(p => p.trim())
    .filter(p => p.length > 40);

  return paragraphs.join('\n\n').slice(0, 14000);
}
