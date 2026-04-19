'use client';

import { sourceDomain } from '@/components/ArticleCard';
import type { FeedItem } from './api';

export const SOURCES_CHANGED_EVENT = 'frontera_sources_changed';

export type FeedFolder = { id: string; name: string; domains: string[] };

const FAVORITES_KEY = 'frontera_favorite_sources';
const KNOWN_KEY = 'frontera_known_sources';
const FEEDS_KEY = 'frontera_feeds';

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function emitChange() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(SOURCES_CHANGED_EVENT));
}

export function setKnownSourcesFromItems(items: FeedItem[]) {
  if (typeof window === 'undefined') return;
  const next = Array.from(
    new Set(
      items
        .map(i => sourceDomain(i.source_url))
        .filter(Boolean),
    ),
  ).sort();
  localStorage.setItem(KNOWN_KEY, JSON.stringify(next));
  emitChange();
}

export function getKnownSources(): string[] {
  if (typeof window === 'undefined') return [];
  return safeJsonParse<string[]>(localStorage.getItem(KNOWN_KEY), []);
}

export function getFavoriteSources(): string[] {
  if (typeof window === 'undefined') return [];
  return safeJsonParse<string[]>(localStorage.getItem(FAVORITES_KEY), []).sort();
}

export function isFavoriteSource(domain: string): boolean {
  return getFavoriteSources().includes(domain);
}

export function toggleFavoriteSource(domain: string) {
  if (typeof window === 'undefined') return;
  const current = new Set(getFavoriteSources());
  if (current.has(domain)) current.delete(domain);
  else current.add(domain);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(current).sort()));
  emitChange();
}

export function getFeedFolders(): FeedFolder[] {
  if (typeof window === 'undefined') return [];
  return safeJsonParse<FeedFolder[]>(localStorage.getItem(FEEDS_KEY), []).sort((a, b) => a.name.localeCompare(b.name));
}

export function createFeedFolder(name: string, domains: string[]) {
  if (typeof window === 'undefined') return;
  const trimmedName = name.trim();
  if (!trimmedName) return;
  const normalized = Array.from(new Set(domains.map(d => d.trim()).filter(Boolean))).sort();
  const next: FeedFolder[] = [
    ...getFeedFolders(),
    { id: crypto.randomUUID(), name: trimmedName, domains: normalized },
  ];
  localStorage.setItem(FEEDS_KEY, JSON.stringify(next));
  emitChange();
}

export function deleteFeedFolder(id: string) {
  if (typeof window === 'undefined') return;
  const next = getFeedFolders().filter(f => f.id !== id);
  localStorage.setItem(FEEDS_KEY, JSON.stringify(next));
  emitChange();
}

export function updateFeedFolder(id: string, updates: Partial<Omit<FeedFolder, 'id'>>) {
  if (typeof window === 'undefined') return;
  const next = getFeedFolders().map(f => f.id === id ? { ...f, ...updates } : f);
  localStorage.setItem(FEEDS_KEY, JSON.stringify(next));
  emitChange();
}

