import { describe, expect, it } from 'vitest';
import { extractArticleTextFromHtml } from './articleExtract';

describe('extractArticleTextFromHtml', () => {
  it('extracts paragraphs from <article>', () => {
    const html = `
      <html><body>
        <article>
          <p>This is a long first paragraph with enough content to pass the filter threshold for extraction.</p>
          <p>This is a long second paragraph with enough content to be included in the final extracted text output.</p>
        </article>
      </body></html>
    `;

    const text = extractArticleTextFromHtml(html);
    expect(text).toContain('long first paragraph');
    expect(text).toContain('long second paragraph');
    expect(text).toContain('\n\n');
  });

  it('prefers itemprop="articleBody" when present', () => {
    const html = `
      <html><body>
        <div class="sidebar"><p>This sidebar paragraph is long enough to be distracting and should not be preferred.</p></div>
        <div itemprop="articleBody">
          <p>This is the real body paragraph with enough content to be extracted, not the sidebar content.</p>
        </div>
      </body></html>
    `;
    const text = extractArticleTextFromHtml(html);
    expect(text).toContain('real body paragraph');
    expect(text).not.toContain('sidebar paragraph');
  });

  it('adds paragraph breaks for <br> and list items', () => {
    const html = `
      <html><body>
        <main>
          <p>This paragraph has a line break<br>and then continues with more words to be long enough for extraction.</p>
          <ul>
            <li>This is a long list item with enough detail to be included in extracted text output.</li>
          </ul>
        </main>
      </body></html>
    `;
    const text = extractArticleTextFromHtml(html);
    expect(text).toContain('line break');
    expect(text).toContain('- This is a long list item');
  });
});

