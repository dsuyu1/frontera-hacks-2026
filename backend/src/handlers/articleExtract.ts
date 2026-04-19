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
  const selectors: RegExp[] = [
    /<[^>]+itemprop=["']articleBody["'][^>]*>([\s\S]*?)<\/(?:div|section|article)>/i,
    /<article\b[^>]*>([\s\S]*?)<\/article>/i,
    /<main\b[^>]*>([\s\S]*?)<\/main>/i,
    /<div[^>]+id=["'][^"']*(?:article|story|content|main)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]+class=["'][^"']*(?:article-body|article-content|entry-content|post-content|story-body|article-text|news-content|field-body|node-content)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
  ];

  for (const selector of selectors) {
    const match = html.match(selector);
    if (match?.[1] && match[1].length > 50) return match[1];
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
