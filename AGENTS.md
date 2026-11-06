# AGENTS.md - Sonora Project Guide

## 📋 Project Overview

**Sonora** is a modern, self-hosted web client for [Navidrome](https://www.navidrome.org/) and other [Subsonic-compatible](http://www.subsonic.org/pages/api.jsp) music streaming servers. Built with React 19, TypeScript 5, and Vite 8, it provides a beautiful, responsive listening experience across desktop and tablet devices.

It has two UIs on one shared core, both running in the browser: the classic UI at `/`, and a keyboard-first terminal UI at `/terminal/`, which is styled as a real TUI.

- **License**: MIT
- **Version**: 0.1.0
- **Author**: Chris
- **Year**: 2026

---

## 🎯 Core Purpose

Sonora connects to Subsonic API-compatible music servers (primarily Navidrome) and provides a full-featured web interface for browsing, searching, and playing music libraries.

---

## 🏗️ Architecture

### Tech Stack

| Category | Technology | Version |
|----------|------------|---------|
| **Framework** | React | 19.3.1 |
| **Language** | TypeScript | 5.6.3 |
| **Build Tool** | Vite | 8.3.6 |
| **Routing** | React Router | 7.18.5 |
| **State Management** | Zustand | 5.0.2 |
| **Virtualization** | TanStack React Virtual | 3.13.22 |
| **API** | Subsonic REST API | v1.16.1 |
| **Styling** | Custom CSS | - |
| **Fonts** | Fraunces, DM Sans (Google Fonts) | - |
| **Deployment** | Docker + nginx | - |

### Project Structure

One npm package and one Vite build, with a page per UI. Dependencies only point inward: `classic -> core` and `terminal -> core`. `scripts/check-boundaries.mjs` enforces this during `npm run build`, so shared logic belongs in `src/core/`, never imported from the other UI.

```
sonora/
├── index.html                    # Classic UI page, served at /
├── terminal/index.html           # Terminal UI page, served at /terminal/
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
├── vite.config.ts                # Build configuration, lists both pages
├── nginx.conf                    # Production nginx configuration
├── Dockerfile                    # Docker build instructions
├── docker-compose.yml            # Docker Compose configuration
├── public/                       # Static assets
├── scripts/
│   └── check-boundaries.mjs      # Fails the build if an import crosses a UI boundary
└── src/
    ├── core/                     # Shared by both UIs. No UI code.
    │   ├── subsonic.ts           # Subsonic API client with all endpoints
    │   ├── store.ts              # Main Zustand store
    │   ├── audio.ts              # Audio element singleton
    │   ├── audioSync.ts          # startAudioSync: audio events, scrobbling, auto-advance
    │   ├── appearance.ts         # startAppearanceSync: applies theme and accent to <html>
    │   ├── artPalette.ts         # Colors from the playing track's cover art, for the album accent
    │   ├── connect.ts            # Normalizes the server URL and verifies the connection
    │   ├── format.ts             # fmt, fmtDuration
    │   ├── library.ts            # groupByDisc
    │   ├── recentSearches.ts     # Recent search history
    │   └── tokens.css            # Design tokens (CSS vars), theme & accent overrides
    ├── classic/                  # Classic UI
    │   ├── main.tsx              # Entry point: imports styles, starts sync, renders App
    │   ├── App.tsx               # Router configuration & protected routes
    │   ├── components/           # Layout, cards, track rows, menus, dialogs, ui.tsx
    │   ├── pages/                # One folder per route (Album, Artist, Home, Library, …)
    │   ├── styles/               # index.css aggregates base, layout, components, pages
    │   └── utils/                # genreGradients, useImageColors, useSliderDrag
    └── terminal/                 # Terminal UI
        ├── main.tsx              # Entry point: imports styles, starts sync, renders App
        ├── App.tsx               # Shows the connect screen or the shell
        ├── nav.ts                # Local store: views, panes, cursors, focus, loading, status
        ├── items.ts              # The Item union behind every list, and how each kind loads
        ├── commands.ts           # What keys do: play, queue, star, reorder
        ├── useKeymap.ts          # Key bindings
        ├── audioTap.ts           # Frequency levels of the playing track, for the spectrum
        ├── motion.ts             # reducedMotion
        ├── terminal.css          # All terminal styles
        ├── views/Shell.tsx       # The screen: header, panes, player, status line
        └── widgets/              # Pane, VirtualList, ItemRow, PlayerLine, Spectrum, Glyphs, DialogOverlay, …
```

### Key Files Reference

| File | Purpose |
|------|---------|
| `src/core/subsonic.ts` | All Subsonic API calls (ping, getAlbum, search3, etc.) |
| `src/core/store.ts` | Central Zustand store for connection, settings, playback, and queue |
| `src/core/audioSync.ts` | Syncs the HTML5 audio element with the store; each UI starts it once |
| `src/classic/App.tsx` | React Router configuration with protected routes |
| `src/classic/components/Layout/Layout.tsx` | Classic layout with sidebar navigation and player bar |
| `src/terminal/nav.ts` | Terminal navigation, list loading, and caching |
| `src/terminal/items.ts` | Terminal list contents, driven by `Item.kind` |
| `src/terminal/audioTap.ts` | Where the terminal spectrum's levels come from, and its CORS fallback |

---

## ✨ Features

### 🎵 Playback
- Full playback controls: play, pause, skip, seek, shuffle, repeat (all/one)
- Volume control with mute toggle
- Queue management with drag-and-drop reordering
- Play next, clear queue, view play history
- Keyboard accessible with ARIA labels

### 📚 Library Browsing
- Browse: albums, artists, playlists, genres, favorites
- Sort options: newest, recent, random, starred, frequent
- Full-text search across artists, albums, songs, genres
- Recent search history
- Virtual scrolling for large libraries

### ❤️ User Features
- Star/unstar tracks and albums (synced to server)
- Browse and play server playlists
- Visual genre cards with dynamic gradient colors
- Accent colors, including an album accent taken from the playing track's cover art
- Configurable scrobble threshold

### ⚙️ Administration
- Trigger quick or full library scans from settings
- Responsive design (desktop & tablet)

---

## 🔌 API Integration

### Subsonic API
- **Base URL**: Configurable via connection screen
- **Authentication**: Subsonic token auth (password hashed client-side)
- **API Version**: 1.16.1
- **Credentials Storage**: Browser localStorage (secure)

### Main Endpoints Used
- `ping` - Verify connection
- `getMusicDirectory` - Browse library
- `getAlbum` - Album details
- `getArtist` - Artist details with albums
- `getAlbumList2` - Album lists (newest, recent, starred, etc.)
- `search3` - Full-text search
- `getGenres` - Genre list
- `getSongsByGenre` - Songs by genre
- `getPlaylist` - Playlist details
- `getPlaylists` - User playlists
- `star` / `unstar` - Favorite management
- `scrobble` - Play tracking
- `startScan` - Library scan trigger

---

## 📦 State Management (Zustand)

The main store (`src/core/store.ts`) is one flat store with no library data. Pages and views fetch albums, artists, and playlists themselves.

- **Connection**: `config`, `isConnected`, `setConfig`, `clearConfig`
- **Settings**: `scrobbleThreshold`, `theme`, `accentColor`, and their setters
- **Classic UI state**: `showNowPlaying`, `playlistVersion`
- **Playback**: `currentTrack`, `isPlaying`, `currentTime`, `duration`, `volume`, `isMuted`, `shuffle`, `repeat`
- **Playback actions**: `playTrack`, `playAlbum`, `playPlaylist`, `playOrToggle`, `togglePlay`, `next`, `prev`, `seekTo`, `setVolume`, `toggleMute`, `toggleShuffle`, `cycleRepeat`
- **Queue**: `queue`, `queueIndex`, `playHistory`, `addToQueue`, `addMultipleToQueue`, `playNext`, `playMultipleNext`, `removeFromQueue`, `moveInQueue`, `clearQueue`
- **Stars**: `setSongStarred(id, starred)`, `starCurrentTrack`

Only `config`, `isConnected`, `volume`, `shuffle`, `repeat`, `scrobbleThreshold`, `theme`, and `accentColor` persist to localStorage (key `sonora-store`). The queue doesn't, so a reload or switching UIs clears it.

The terminal UI keeps its own navigation state in `src/terminal/nav.ts`.

---

## 🚀 Development

### Prerequisites
- Node.js 20.19+ or 22.12+
- npm

### Commands
```bash
npm install      # Install dependencies
npm run dev      # Start dev server at http://localhost:5173 (terminal UI at /terminal/)
npm run build    # Check import boundaries and types, then build to dist/
npm run preview  # Preview production build
```

### Docker
```bash
# Build and run
docker build -t sonora .
docker run -d -p 8080:80 --restart unless-stopped sonora

# Or with Docker Compose
docker compose up -d
```

### Dev Server
- Runs on `http://localhost:5173`
- Hot module replacement enabled
- Uses `vite --host` for network access

### Production Build
- Outputs to `dist/` directory
- Uses nginx for serving (see `nginx.conf`)
- Dockerfile copies dist files and nginx config

---

## 🎨 UI/UX Patterns

### Navigation
- Classic: sidebar with sections Home, Library (Albums/Artists/Playlists/Genres/Favorites), Queue, Settings; breadcrumbs in library views; persistent bottom player bar
- Terminal: library, list, and detail panes; `esc` goes back; press `?` for keys

### Styling
- Custom CSS (no framework)
- Google Fonts: Fraunces (headings) and DM Sans (body) in classic; JetBrains Mono in terminal
- CSS variables for colors
- Responsive grid layouts

### Component Patterns (classic)
- `TrackRow` - Standard track listing with menu
- `AlbumCard` / `ArtistCard` - Grid card components
- `CoverArt` - Handles cover art loading and placeholders
- `QueueItem` - Queue track display
- `TrackMenu` - Context menu for track actions

### Terminal UI Patterns
- Every list shows `Item`s. A new kind of row needs a case in `ItemRow` and in `items.ts`.
- All keys go through one global handler in `useKeymap.ts`, which ignores inputs and modified keys
- Keyboard first, but everything must work with a mouse too. Hints in `StatusLine.tsx` show what's possible right now, and clicking one presses its key
- Modal boxes go through `openDialog` in `nav.ts` (`pick`, `prompt`, or `confirm`), which `useKeymap.ts` and `DialogOverlay.tsx` handle
- It should look like a program running in a terminal, so ask whether a terminal could draw it. Everything sits on one character grid: one font size, cells `CELL_WIDTH` wide and `ROW_HEIGHT` tall (both in `nav.ts`), spacing in whole cells. Use `ch` and `--t-row`, never other sizes. No rounded corners, shadows, gradients, blur, or big type
- Rows are one `ROW_HEIGHT` tall, and each field clips to its column, so wide titles can't break the grid. A separator is a whole row too (`.t-rule`), so rows stay on the grid in every pane
- Facts about a whole list go in its pane's `summary`, not in rows, because actions go by row position. `detailSummary` in `items.ts` builds the detail pane's, and `Screen.summary` the list pane's
- Colors come from `src/core/tokens.css`, through the `--t-*` mixes at the top of `terminal.css`. Use those rather than the raw tokens, so text stays legible and surfaces match in both themes and every accent
- One accent only. Emphasis comes from bold, the accent, and inverse video, never from more hues or sizes. The one exception is the spectrum under the album accent, whose bars run along a gradient of the cover art's colors, one solid color per bar as a terminal would color a column
- Controls and symbols are plain ASCII: `*`, `>`, `[x]`, `[|<]`, `[=====>---]`. JetBrains Mono's web font has no stars, transport, box-drawing, or block glyphs, and fallback fonts draw them at widths that break the grid. Box borders are CSS, and the spectrum and logo's blocks are painted shapes
- The selected row is in inverse video where the focus is, and on a dim background in other panes. It jumps from row to row, rather than gliding
- `Spectrum` draws real levels from `audioTap.ts` in browsers that can capture audio (Chromium), and a decorative pattern elsewhere. It stops its animation loop when there's nothing to show. Keep it that way, because music plays for hours
- Nothing tweens: changes repaint at once. Only the spectrum, the spinner, and the blinking caret move, and they respect `prefers-reduced-motion` through the rule at the end of `terminal.css` and `reducedMotion` in `motion.ts`

---

## 🔍 Code Conventions

### TypeScript
- Strict mode enabled
- Explicit types for API responses
- Interface definitions for Subsonic API types

### React
- Functional components with hooks
- TypeScript interfaces for props
- Custom hooks in `src/classic/utils/`, or beside their use in `src/terminal/`

### File Organization
- Logic that both UIs could use goes in `src/core/`, with no React components or CSS except tokens
- Classic pages in `src/classic/pages/` with subdirectories per route
- Classic components in `src/classic/components/`
- Terminal code in `src/terminal/`

### Naming
- PascalCase for components and types
- camelCase for variables and functions
- `Page` suffix for route-level components (e.g., `HomePage`)

---

## 🛠️ Key Utilities

| Utility | Location | Purpose |
|---------|----------|---------|
| `fmt`, `fmtDuration` | `src/core/format.ts` | Format durations; `fmt` expects whole seconds |
| `groupByDisc` | `src/core/library.ts` | Group an album's songs by disc |
| `releaseType` | `src/core/library.ts` | Call a release a Single, EP, or Album by its track count |
| `plural` | `src/core/format.ts` | "1 track", "2 tracks" |
| `useSliderDrag` | `src/classic/utils/useSliderDrag.ts` | Handle slider drag interactions |
| `genreGradients` | `src/classic/utils/genreGradients.ts` | Predefined color gradients per genre |
| `useImageColors` | `src/classic/utils/useImageColors.ts` | Extract dominant colors from images (currently unused) |
| `useArtPalette`, `currentArtColors` | `src/core/artPalette.ts` | The playing track's cover art colors, fitted to the theme |

---

## 📡 External Dependencies

### Runtime
- `react` & `react-dom` - UI library
- `react-router` - Client-side routing
- `@tanstack/react-virtual` - Virtual scrolling
- `zustand` - State management

### Build
- `vite` - Build tool
- `@vitejs/plugin-react` - React plugin for Vite
- `typescript` - Type checking
- `@types/react`, `@types/react-dom` - Type definitions

---

## 🎯 Common Tasks for Agents

### Adding a New Classic Page
1. Create component in `src/classic/pages/NewPage/NewPage.tsx`
2. Add route in `src/classic/App.tsx`
3. Add navigation link in the sidebar (if needed)

### Adding a Terminal View
1. Add it to `ViewId` and `VIEWS` in `src/terminal/nav.ts`
2. Add a case to `viewScreen` that says how to load its items
3. Add its hints to `useHints` in `src/terminal/widgets/StatusLine.tsx`

### Adding a Terminal Key
1. Add the binding in `src/terminal/useKeymap.ts`, with the logic in `commands.ts` if it's more than a line
2. List it in `src/terminal/widgets/HelpOverlay.tsx`
3. Add a hint to `useHints` in `src/terminal/widgets/StatusLine.tsx`, so the mouse can reach it

### Adding API Endpoint
1. Add function to `src/core/subsonic.ts`
2. Add store actions in `src/core/store.ts` if the behaviour belongs to both UIs
3. Use it from pages or views

### Adding New State
1. Shared state: extend the interface and initial state in `src/core/store.ts`, and add it to `partialize` if it should persist
2. Terminal-only state: add it to `src/terminal/nav.ts`
3. Classic-only state: prefer local component state

### Styling Components
- Shared tokens go in `src/core/tokens.css`
- Classic: global rules in `src/classic/styles/base.css`; component and page styles under `src/classic/styles/components/` and `pages/`. Register new files in `src/classic/styles/index.css`.
- Terminal: `src/terminal/terminal.css`
- Follow the existing color scheme and typography
- Put a vendor-prefixed property before its standard one (`-webkit-backdrop-filter`, then `backdrop-filter`). Vite minifies CSS with Lightning CSS, which keeps only the last of the pair

---

## ⚠️ Important Notes

1. **Authentication**: Password is hashed client-side using Subsonic token auth. Never send plain text passwords.
2. **Connection Storage**: Credentials stored in browser localStorage.
3. **Server URL**: If `https://` is omitted, it's added automatically.
4. **Responsive Design**: Targets desktop and tablet screens (not mobile-optimized).
5. **Virtual Scrolling**: Used for large lists (albums, tracks) via `@tanstack/react-virtual`.
6. **Audio Element**: Managed as singleton in `src/core/audio.ts`. Each UI calls `startAudioSync()` once in its `main.tsx`.
7. **Two Pages**: Each UI's CSS and fonts load only on its own page. Switching UIs is a full page load, which stops playback and clears the queue.
8. **Album Accent**: `appearance.ts` loads the cover art's palette only while the album accent is selected, and sets `--accent`, `--accent-dim`, and `--accent-hover` inline on `<html>`. It has no rule in `tokens.css`, so it shows the default accent until the art loads, and when the art is gray or the server sends no CORS headers for it.
9. **Stream CORS**: The terminal UI requests streams with CORS so `audioTap.ts` can read them. If a server refuses, it plays the track again without CORS and the spectrum falls back to its pattern. The classic UI doesn't do any of this. Never route the audio element through `createMediaElementSource`, which silences tracks that don't allow CORS.

---

## 🔗 Quick Links

- [Navidrome](https://www.navidrome.org/) - Primary target server
- [Subsonic API Docs](http://www.subsonic.org/pages/api.jsp) - API reference
- [React](https://react.dev/) - UI framework
- [Zustand](https://github.com/pmndrs/zustand) - State management
- [Vite](https://vitejs.dev/) - Build tool

---

## 📝 File Modification Guide

| To Change | Edit File |
|-----------|-----------|
| Add a classic route | `src/classic/App.tsx` |
| Add a terminal view or key | `src/terminal/nav.ts`, `src/terminal/useKeymap.ts` |
| Modify API calls | `src/core/subsonic.ts` |
| Update state logic | `src/core/store.ts` |
| Change audio behavior | `src/core/audioSync.ts` |
| Modify classic layout | `src/classic/components/Layout/Layout.tsx` |
| Modify terminal layout | `src/terminal/views/Shell.tsx`, `src/terminal/terminal.css` |
| Update global tokens | `src/core/tokens.css` |
| Add a new UI page | `vite.config.ts` and `scripts/check-boundaries.mjs` |

---

*Last updated: Project initialization*
*Maintain this file as the project evolves.*
