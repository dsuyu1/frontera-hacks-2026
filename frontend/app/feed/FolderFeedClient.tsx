'use client';
import { useEffect, useState } from 'react';
import FeedLayout from '@/components/FeedLayout';
import { useFeedItems } from '@/hooks/useFeed';
import { sourceDomain } from '@/components/ArticleCard';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import {
  SOURCES_CHANGED_EVENT,
  getFeedFolders,
  getKnownSources,
  updateFeedFolder,
  type FeedFolder,
} from '@/lib/sources';

const PICKER_LABEL = 'source-picker-title';

function SourcePicker({ folder, onClose }: { folder: FeedFolder; onClose: () => void }) {
  const containerRef = useFocusTrap(true);
  const [known, setKnown] = useState<string[]>(() => getKnownSources());
  const [selected, setSelected] = useState<Set<string>>(new Set(folder.domains));

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    const sync = () => setKnown(getKnownSources());
    window.addEventListener(SOURCES_CHANGED_EVENT, sync);
    return () => window.removeEventListener(SOURCES_CHANGED_EVENT, sync);
  }, []);

  function toggle(domain: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(domain) ? next.delete(domain) : next.add(domain);
      return next;
    });
  }

  function save() {
    updateFeedFolder(folder.id, { domains: Array.from(selected).sort() });
    onClose();
  }

  return (
    <div
      role="presentation"
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={PICKER_LABEL}
        style={{
          background: 'var(--reader-bg)', border: '1px solid var(--border)',
          borderRadius: 12, padding: 24, width: 380, maxWidth: 'calc(100vw - 32px)',
          maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: 16,
        }}
      >
        <h2 id={PICKER_LABEL} style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Add sources to &ldquo;{folder.name}&rdquo;
        </h2>

        {known.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            No sources found yet. Browse a feed first so sources are discovered.
          </p>
        ) : (
          <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {known.map(domain => (
              <label
                key={domain}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', borderRadius: 6, cursor: 'pointer',
                  background: selected.has(domain) ? 'var(--sidebar-active-bg)' : 'transparent',
                  transition: 'background 0.1s',
                }}
              >
                <input
                  type="checkbox"
                  checked={selected.has(domain)}
                  onChange={() => toggle(domain)}
                  style={{ accentColor: 'var(--accent)', width: 15, height: 15, cursor: 'pointer' }}
                />
                <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: selected.has(domain) ? 600 : 400 }}>
                  {domain}
                </span>
              </label>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px', borderRadius: 6, background: 'none',
              border: '1px solid var(--border)', color: 'var(--text-muted)',
              fontSize: 13, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={save}
            style={{
              padding: '8px 16px', borderRadius: 6,
              background: 'var(--accent)', color: '#fff',
              border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FolderFeedClient({ folderId }: { folderId: string }) {
  const [folder, setFolder] = useState<FeedFolder | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const { data, isLoading } = useFeedItems({ limit: 200 });

  useEffect(() => {
    const sync = () => {
      const found = getFeedFolders().find(f => f.id === folderId) ?? null;
      setFolder(found);
    };
    sync();
    window.addEventListener(SOURCES_CHANGED_EVENT, sync);
    return () => window.removeEventListener(SOURCES_CHANGED_EVENT, sync);
  }, [folderId]);

  if (!folder) {
    return (
      <FeedLayout
        title="Feed not found"
        items={[]}
        loading={false}
      />
    );
  }

  const allItems = data?.items ?? [];
  const filtered = folder.domains.length > 0
    ? allItems.filter(item => folder.domains.includes(sourceDomain(item.source_url)))
    : [];

  const subtitle = folder.domains.length > 0
    ? `${folder.domains.length} source${folder.domains.length === 1 ? '' : 's'}`
    : undefined;

  return (
    <>
      <FeedLayout
        title={folder.name}
        subtitle={subtitle}
        items={filtered}
        loading={isLoading}
        headerAction={
          <button
            onClick={() => setShowPicker(true)}
            style={{
              padding: '7px 14px', borderRadius: 6,
              background: 'none', border: '1px solid var(--border)',
              color: 'var(--text-muted)', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.1s',
            }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--accent)'; el.style.color = 'var(--accent)'; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--border)'; el.style.color = 'var(--text-muted)'; }}
          >
            {folder.domains.length === 0 ? '+ Add sources' : 'Edit sources'}
          </button>
        }
      />
      {showPicker && (
        <SourcePicker folder={folder} onClose={() => setShowPicker(false)} />
      )}
    </>
  );
}
