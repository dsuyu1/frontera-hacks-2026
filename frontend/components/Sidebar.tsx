'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useFeedStore } from '@/lib/store';
import { useLocalities, useCategories, useFeedItems } from '@/hooks/useFeed';
import { Locality } from '@/lib/api';

function NavItem({ href, label, count }: { href: string; label: string; count?: number }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={`flex items-center justify-between px-3 py-1.5 rounded-md text-sm transition-colors ${
        active
          ? 'bg-blue-50 text-blue-700 font-medium'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <span>{label}</span>
      {count != null && count > 0 && (
        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${active ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'}`}>
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}

function LocalityItem({ locality }: { locality: Locality }) {
  const pathname = usePathname();
  const active = pathname === `/locality/${locality.id}`;
  return (
    <Link
      href={`/locality/${locality.id}`}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
        active
          ? 'bg-blue-50 text-blue-700 font-medium'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
      {locality.name}
    </Link>
  );
}

export default function Sidebar() {
  const { data: localities } = useLocalities();
  const { data: categories } = useCategories();
  const { data: feed } = useFeedItems();
  const { selectedCategories, setCategories } = useFeedStore();

  const unreadCount = feed?.items.length ?? 0;

  const toggleCategory = (slug: string) => {
    const next = selectedCategories.includes(slug)
      ? selectedCategories.filter((s) => s !== slug)
      : [...selectedCategories, slug];
    setCategories(next);
  };

  return (
    <aside className="w-[240px] flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-full overflow-y-auto">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
            <span className="text-white text-xs font-bold">F</span>
          </div>
          <span className="font-semibold text-gray-900 tracking-tight">Frontera</span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5 ml-9">RGV Local Government</p>
      </div>

      {/* Smart feeds */}
      <div className="px-2 pt-4 pb-2">
        <NavItem href="/today" label="Today" count={unreadCount} />
        <NavItem href="/all" label="All Articles" />
        <NavItem href="/read-later" label="Saved" />
        <NavItem href="/videos" label="Video Clips" />
      </div>

      <div className="mx-3 border-t border-gray-100 my-1" />

      {/* Localities */}
      <div className="px-2 py-2">
        <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">Localities</p>
        {localities?.map((loc) => <LocalityItem key={loc.id} locality={loc} />) ?? (
          <div className="px-3 py-2 text-xs text-gray-400 animate-pulse">Loading...</div>
        )}
      </div>

      <div className="mx-3 border-t border-gray-100 my-1" />

      {/* Category filters */}
      <div className="px-2 py-2 flex-1">
        <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">Filter by Topic</p>
        {categories?.map((cat) => {
          const on = selectedCategories.includes(cat.slug);
          return (
            <button
              key={cat.id}
              onClick={() => toggleCategory(cat.slug)}
              className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-sm transition-colors text-left ${
                on ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>{cat.name}</span>
              {on && <span className="w-3 h-3 bg-blue-500 rounded-sm flex-shrink-0 flex items-center justify-center">
                <svg viewBox="0 0 8 8" className="w-2 h-2 fill-white"><path d="M1 4l2 2 4-4"/></svg>
              </span>}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100">
        <p className="text-xs text-gray-400">Daily batch updates at 3:00 AM</p>
      </div>
    </aside>
  );
}
