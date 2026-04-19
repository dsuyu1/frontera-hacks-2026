import { extractArticleTextFromHtml } from './articleExtract';

export type ArticleResponse = {
  text: string;
  content_type: string | null;
  embed_url: string | null;
};

export async function buildArticleResponse(res: Response, targetUrl: string): Promise<ArticleResponse> {
  const contentType = res.headers.get('content-type');
  const ct = contentType ? contentType.split(';')[0].trim().toLowerCase() : null;

  if (ct === 'application/pdf' || targetUrl.toLowerCase().includes('.pdf')) {
    return { text: '', content_type: ct, embed_url: targetUrl };
  }

  if (ct && !ct.includes('html') && !ct.includes('xml') && !ct.includes('text')) {
    return { text: '', content_type: ct, embed_url: null };
  }

  const html = await res.text();
  return { text: extractArticleTextFromHtml(html), content_type: ct, embed_url: null };
}

