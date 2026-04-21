import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';

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

function regexFallback(html: string): string {
  const cleaned = stripNoise(html);

  const greedySelectors: RegExp[] = [
    /<[^>]+itemprop=["']articleBody["'][^>]*>([\s\S]*)<\/(?:div|section|article)>/i,
    /<article\b[^>]*>([\s\S]*)<\/article>/i,
    /<main\b[^>]*>([\s\S]*)<\/main>/i,
  ];

  for (const selector of greedySelectors) {
    const match = cleaned.match(selector);
    if (match?.[1] && match[1].length > 50) {
      return htmlToText(match[1]);
    }
  }

  const divPatterns: RegExp[] = [
    /<div[^>]+id=["'][^"']*(?:article|story|content|main)[^"']*["'][^>]*>/i,
    /<div[^>]+class=["'][^"']*(?:article-body|article-content|entry-content|post-content|story-body|article-text|news-content|field-body|node-content)[^"']*["'][^>]*>/i,
  ];

  for (const pattern of divPatterns) {
    const match = cleaned.match(pattern);
    if (match) {
      const start = match.index! + match[0].length;
      const chunk = cleaned.slice(start, start + 60_000);
      if (chunk.length > 50) return htmlToText(chunk);
    }
  }

  return htmlToText(cleaned);
}

export function extractArticleTextFromHtml(html: string, pageUrl?: string): string {
  try {
    const { document } = parseHTML(html, { url: pageUrl ?? 'https://example.com' });
    const reader = new Readability(document as unknown as Document);
    const article = reader.parse();
    if (article?.textContent && article.textContent.trim().length > 100) {
      const text = article.textContent
        .replace(/[ \t]{2,}/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      return text.slice(0, 14_000);
    }
  } catch {
    // fall through to regex
  }

  const text = regexFallback(html);
  const paragraphs = text
    .split('\n\n')
    .map(p => p.trim())
    .filter(p => p.length > 40);

  return paragraphs.join('\n\n').slice(0, 14_000);
}
