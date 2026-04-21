import { describe, expect, it } from 'vitest';
import { decodeEntities, parseYouTubeRss } from './youtube';

describe('decodeEntities', () => {
  it('decodes basic HTML entities', () => {
    expect(decodeEntities('Fish &amp; Chips &quot;yay&quot; &#39;ok&#39;')).toBe('Fish & Chips "yay" \'ok\'');
  });
});

describe('parseYouTubeRss', () => {
  it('parses entries and trims description to 500 chars', () => {
    const xml = `<?xml version="1.0"?>
      <feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/">
        <entry>
          <yt:videoId>abc123</yt:videoId>
          <title>Hi &amp; Bye</title>
          <published>2024-01-01T00:00:00+00:00</published>
          <media:description>${'x'.repeat(900)}</media:description>
        </entry>
      </feed>`;

    const items = parseYouTubeRss(xml);
    expect(items).toHaveLength(1);
    expect(items[0].videoId).toBe('abc123');
    expect(items[0].title).toBe('Hi & Bye');
    expect(items[0].description).toHaveLength(500);
    expect(items[0].published).toBe('2024-01-01T00:00:00+00:00');
  });

  it('skips entries missing videoId or title', () => {
    const xml = `<?xml version="1.0"?>
      <feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/">
        <entry><yt:videoId></yt:videoId><title>T</title></entry>
        <entry><yt:videoId>abc</yt:videoId><title></title></entry>
      </feed>`;

    expect(parseYouTubeRss(xml)).toHaveLength(0);
  });
});
