import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import VideoPlayer from './VideoPlayer';

describe('VideoPlayer', () => {
  test('adds autoplay params to YouTube embeds', () => {
    const { container } = render(
      <VideoPlayer
        autoplay
        clip={{
          id: '1',
          s3_key: null,
          embed_url: 'https://www.youtube.com/embed/abc123?start=10&end=70',
          title: 't',
          summary: null,
          start_time_s: 10,
          end_time_s: 70,
          categories: [],
        }}
      />,
    );

    const iframe = container.querySelector('iframe');
    expect(iframe).toBeTruthy();
    const src = iframe?.getAttribute('src') ?? '';
    expect(src).toContain('autoplay=1');
    expect(src).toContain('mute=1');
    expect(src).toContain('start=10');
    expect(src).toContain('end=70');
  });

  test('enables autoplay+muted on native video playback', () => {
    const { container } = render(
      <VideoPlayer
        autoplay
        clip={{
          id: '1',
          s3_key: null,
          embed_url: null,
          playback_url: 'https://cdn.example.com/v.mp4',
          title: 't',
          summary: null,
          start_time_s: 10,
          end_time_s: 70,
          categories: [],
        }}
      />,
    );

    const video = container.querySelector('video');
    expect(video).toBeTruthy();
    expect((video as HTMLVideoElement).autoplay).toBe(true);
    expect((video as HTMLVideoElement).muted).toBe(true);
  });
});
