import { describe, expect, it } from 'vitest';
import { parseElectionSnapshotFromText } from './elections';

describe('parseElectionSnapshotFromText', () => {
  it('parses Hidalgo-style election day and early voting range', () => {
    const text = `Early voting will begin Monday, April 20, 2026 and will run to Tuesday, April 28, 2026. Election Day is Saturday, May 2, 2026.`;
    const s = parseElectionSnapshotFromText(text);
    expect(s.nextElectionDate).toBe('2026-05-02');
    expect(s.earlyVotingStart).toBe('2026-04-20');
    expect(s.earlyVotingEnd).toBe('2026-04-28');
  });

  it('parses Cameron-style header line', () => {
    const text = `For the May 2, 2026 - Joint Local Election.`;
    const s = parseElectionSnapshotFromText(text);
    expect(s.nextElectionDate).toBe('2026-05-02');
  });
});

