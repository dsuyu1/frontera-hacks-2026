import { describe, expect, it } from 'vitest';
import { buildArticleResponse } from './articleResponse';

function makeRes(body: string, contentType: string): Response {
  return new Response(body, { headers: { 'content-type': contentType } });
}

describe('buildArticleResponse', () => {
  it('returns embed_url for PDFs', async () => {
    const r = await buildArticleResponse(makeRes('%PDF-1.7', 'application/pdf'), 'https://example.com/report.pdf');
    expect(r.text).toBe('');
    expect(r.embed_url).toBe('https://example.com/report.pdf');
    expect(r.content_type).toBe('application/pdf');
  });

  it('extracts text for HTML', async () => {
    const r = await buildArticleResponse(makeRes('<article><p>Hello world this is a longer paragraph so it passes.</p></article>', 'text/html; charset=utf-8'), 'https://example.com/a');
    expect(r.content_type).toBe('text/html');
    expect(r.embed_url).toBeNull();
    expect(r.text).toContain('Hello world');
  });
});

