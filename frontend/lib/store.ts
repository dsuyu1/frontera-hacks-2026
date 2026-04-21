'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FeedState {
  readIds: Set<string>;
  savedIds: Set<string>;
  selectedLocalities: string[];
  selectedCategories: string[];
  markRead: (id: string) => void;
  markUnread: (id: string) => void;
  toggleSaved: (id: string) => void;
  setLocalities: (ids: string[]) => void;
  setCategories: (slugs: string[]) => void;
}

// Zustand doesn't serialize Sets by default — wrap with plain object for persist
export const useFeedStore = create<FeedState>()(
  persist(
    (set, get) => ({
      readIds: new Set<string>(),
      savedIds: new Set<string>(),
      selectedLocalities: [],
      selectedCategories: [],

      markRead: (id) => set((s) => ({ readIds: new Set([...s.readIds, id]) })),
      markUnread: (id) => set((s) => { const n = new Set(s.readIds); n.delete(id); return { readIds: n }; }),
      toggleSaved: (id) =>
        set((s) => {
          const n = new Set(s.savedIds);
          n.has(id) ? n.delete(id) : n.add(id);
          return { savedIds: n };
        }),
      setLocalities: (ids) => set({ selectedLocalities: ids }),
      setCategories: (slugs) => set({ selectedCategories: slugs }),
    }),
    {
      name: 'frontera-feed',
      storage: {
        getItem: (key) => {
          const raw = localStorage.getItem(key);
          if (!raw) return null;
          const parsed = JSON.parse(raw);
          if (parsed.state) {
            parsed.state.readIds = new Set(parsed.state.readIds ?? []);
            parsed.state.savedIds = new Set(parsed.state.savedIds ?? []);
          }
          return parsed;
        },
        setItem: (key, val) => {
          const s = { ...val, state: { ...val.state, readIds: [...val.state.readIds], savedIds: [...val.state.savedIds] } };
          localStorage.setItem(key, JSON.stringify(s));
        },
        removeItem: (key) => localStorage.removeItem(key),
      },
    },
  ),
);
