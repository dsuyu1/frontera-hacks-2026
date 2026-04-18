# Feedly-Style UI (Gov Feed Frontend) — Plan & Requirements

## Goal
Build a Feedly-style reader UI for the local-government feed product: a familiar 3‑pane layout for browsing a locality-scoped daily feed, reading summaries, and watching generated meeting clips.

## Non-goals
- No real Feedly API integration.
- No complex personalization beyond locality + include/exclude categories (ranking is later).
- No account management, billing, teams, or admin.

## Target UX (high-level)
A responsive **3‑pane layout**:
1. **Left navigation**: Home sections + collections + feeds.
2. **Middle list**: Articles for the selected source/section.
3. **Right reader**: Article content/details.

Support quick keyboard-driven reading: open next/prev article, mark as read/unread, and return to list.

## Information Architecture
### Primary routes
- `/` → Redirect to `/today`.
- `/today` → “Today” smart feed.
- `/all` → “All” / “All Feeds” smart feed.
- `/read-later` → Saved articles.
- `/locality/:localityId` → Locality feed (e.g., Edinburg, McAllen, Mission).
- `/search?q=` → Search results across articles (client-side for demo).
- `/settings` (optional v1.1) → Preferences (theme, density, shortcuts).

### Core UI regions
- **Top bar**
  - Search input
  - View toggles (List / Cards) (optional v1.1)
  - Density toggle (Compact / Comfortable) (optional v1.1)
- **Left sidebar**
  - App logo/name
  - Smart sections: Today, All, Read Later
  - Collections (expand/collapse)
  - Feeds under collections
  - Unread counts
- **Article list (middle)**
  - Sorting: “Newest first”
  - Filters: Unread / All
  - Each row shows: source, title, snippet, published time, (optional) thumbnail
- **Reader (right)**
  - Title, author/source, date
  - Hero image (optional)
  - Content body (safe rendering)
  - Actions: Mark read/unread, Save/Unsave (Read Later), Open original

## Functional Requirements
### Navigation & selection
- Clicking a left-nav item loads its article list.
- Selecting an article row opens it in the reader pane.
- Selected nav item and selected article are visually highlighted.

### Read state
- Each article has `read: boolean`.
- Opening an article **marks it as read** (configurable later).
- “Unread only” filter hides read items.
- Mark read/unread action available in:
  - Reader actions
  - Article row context menu (optional v1.1)

### Save / Read Later
- Each article has `saved: boolean`.
- Save/unsave available from the reader.
- `/read-later` shows saved articles (read or unread).

### Keyboard shortcuts (v1)
Support a minimal, consistent set (not necessarily identical to Feedly):
- `j` / `k` → next / previous article in list
- `o` or `Enter` → open selected article in reader
- `m` → toggle read/unread for selected/open article
- `s` → toggle saved (Read Later)
- `/` → focus search
- `Esc` → blur search / close overlays

### Search
- Search input filters articles by title + snippet + source name.
- Results appear in `/search?q=` and update on submit.

### Locality + category filters
- A user selects one or more localities (MVP: Edinburg, McAllen, Mission).
- A user selects included categories and optional excluded categories.
- Filters apply to both text items and video-derived items.

### Responsive behavior
- Desktop (>= 1024px): 3 panes visible.
- Tablet (>= 768px): 2 panes (sidebar + list; reader opens as overlay or replaces list).
- Mobile: single-pane navigation (drawer sidebar; reader is its own view with back button).

### Persistence
- Persist to `localStorage`:
  - read state
  - saved state
  - last selected source
  - UI preferences (theme/density) when implemented

## Visual Requirements
### Styling goals
- Clean, neutral UI with strong hierarchy and subtle separators.
- Consistent spacing scale (e.g., 4/8/12/16/24).
- Typography with clear distinction:
  - Sidebar labels
  - Article titles (semibold)
  - Metadata (muted)

### States
- Hover state for nav items and article rows.
- Selected state for nav item and article row.
- Read items appear visually muted relative to unread.
- Unread count badges for nav entries.

## Data Model (demo)
### Entities
- `Collection`
  - `id`, `name`, `feedIds[]`
- `Feed`
  - `id`, `title`, `siteUrl`, `collectionId`
- `Article`
  - `id`, `feedId`, `source`, `title`, `snippet`, `contentHtml`, `url`, `publishedAt`, `imageUrl?`, `read`, `saved`

### Backend alignment (target)
- Replace fixture-loading with API calls:
  - `GET /localities`
  - `GET /categories`
  - `GET /feed?locality=...&categories=...`
  - `GET /clips/:id`

### Demo data generation
- Seeded JSON fixtures checked into repo.
- Ensure enough data to test scrolling (e.g., 200–500 articles across multiple feeds).

## Implementation Plan (incremental)
### Milestone 1 — App scaffold + layout shell
- Stack: **React + Next.js (App Router) + Tailwind CSS**.
- Deployment target: **AWS Amplify Hosting** (Gen 2); connect git repo, enable SSR.
- Auth (if needed): wire **Amplify Auth** (Cognito User Pool).
- Implement layout with sidebar, list pane, reader pane.
- Set up routing and selection state.

### Milestone 2 — Article list + reader behavior
- Load fixture data.
- Implement article selection, open behavior, and mark-as-read.
- Add saved (Read Later) state.
- Add unread filter toggle.

### Milestone 3 — Keyboard shortcuts + persistence
- Implement shortcuts (`j/k/o/m/s`, `/`, `Esc`).
- Persist state to `localStorage`.

### Milestone 4 — Responsive modes + polish
- Tablet/mobile behavior adjustments.
- Visual polish: typography, spacing, subtle dividers.
- Empty/loading states.

### Milestone 5 (optional) — Extras
- Context menus
- View modes (List/Cards)
- Density control
- Settings screen

## Acceptance Criteria
- Sidebar navigation updates article list correctly.
- Article selection opens in reader and marks as read.
- Unread filter works.
- Read Later save/unsave works and list is accessible.
- Keyboard shortcuts work end-to-end.
- State persists across refresh.
- Responsive behavior matches the described breakpoints.

## Open Questions
- Should opening an article always mark as read, or only after X seconds?
- Should the reader render full HTML or simplified content?

## Resolved Decisions
- **Stack**: React + Next.js (App Router) + Tailwind CSS.
- **Hosting**: AWS Amplify Hosting Gen 2 (not Vercel); SSR handled by Amplify's Lambda@Edge integration.
- **Auth**: Amazon Cognito via Amplify Auth (optional for MVP, but scaffolded from day one).
