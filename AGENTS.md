# AGENTS.md - Sonora Project Guide

## 📋 Project Overview

**Sonora** is a modern, self-hosted web client for [Navidrome](https://www.navidrome.org/) and other [Subsonic-compatible](http://www.subsonic.org/pages/api.jsp) music streaming servers. Built with React 18, TypeScript 5, and Vite 6, it provides a beautiful, responsive listening experience across desktop and tablet devices.

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
| **Framework** | React | 18.3.1 |
| **Language** | TypeScript | 5.6.3 |
| **Build Tool** | Vite | 6.0.3 |
| **Routing** | React Router | 6.28.0 |
| **State Management** | Zustand | 5.0.2 |
| **Virtualization** | TanStack React Virtual | 3.13.22 |
| **API** | Subsonic REST API | v1.16.1 |
| **Styling** | Custom CSS | - |
| **Fonts** | Fraunces, DM Sans (Google Fonts) | - |
| **Deployment** | Docker + nginx | - |

### Project Structure

```
sonora/
├── index.html                    # Entry HTML with font imports
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
├── vite.config.ts                # Vite build configuration
├── nginx.conf                    # Production nginx configuration
├── Dockerfile                    # Docker build instructions
├── docker-compose.yml            # Docker Compose configuration
├── public/                       # Static assets
└── src/
    ├── main.tsx                  # React entry point (renders App)
    ├── App.tsx                   # Router configuration & protected routes
    ├── api/
    │   └── subsonic.ts           # Subsonic API client with all endpoints
    ├── components/
    │   ├── Layout/               # Main app layout with sidebar & player
    │   │   └── Layout.tsx
    │   ├── AddToPlaylistDialog.tsx
    │   ├── AlbumCard.tsx          # Album card for grid displays
    │   ├── ArtistCard.tsx         # Artist card component
    │   ├── CoverArt.tsx           # Album/artist cover art display
    │   ├── QueueItem.tsx          # Queue track item
    │   ├── TrackMenu.tsx          # Context menu for tracks
    │   ├── TrackRow.tsx           # Track listing in tables
    │   └── ui.tsx                 # Shared UI primitives & utilities
    ├── pages/
    │   ├── Connect/              # Server connection setup
    │   │   └── ConnectPage.tsx
    │   ├── Home/                  # Landing page after connection
    │   │   └── HomePage.tsx
    │   ├── Album/                 # Album detail view
    │   │   └── AlbumPage.tsx
    │   ├── Artist/                # Artist detail view
    │   │   └── ArtistPage.tsx
    │   ├── Genre/                 # Genre detail view
    │   │   └── GenrePage.tsx
    │   ├── Library/               # Library browser sections
    │   │   ├── AlbumsPage.tsx
    │   │   ├── ArtistsPage.tsx
    │   │   ├── PlaylistsPage.tsx
    │   │   ├── GenresPage.tsx
    │   │   └── FavoritesPage.tsx
    │   ├── NowPlaying/            # Currently playing view
    │   │   └── (files)
    │   ├── Playlist/              # Playlist detail view
    │   │   └── PlaylistPage.tsx
    │   ├── Queue/                 # Play queue management
    │   │   └── QueuePage.tsx
    │   ├── Search/                # Search results
    │   │   └── SearchPage.tsx
    │   └── Settings/              # App settings
    │       └── SettingsPage.tsx
    ├── store/                     # Zustand state management
    │   ├── audioElement.ts        # Audio element singleton
    │   ├── useAudioSync.ts        # Sync audio element → store
    │   └── useStore.ts            # Main store with slices (audio, queue, library, settings, favorites)
    ├── styles/
    │   ├── index.css              # Aggregator — imports tokens, layout, components, pages in order
    │   ├── tokens.css             # Design tokens (CSS vars), theme & accent overrides
    │   ├── base.css               # Reset, typography, scrollbars
    │   ├── layout/                # app-shell, sidebar, main, player-bar
    │   ├── components/            # cards, buttons, dialogs, track-list, etc.
    │   └── pages/                 # album, artist, library, now-playing, queue, settings, …
    └── utils/
        ├── genreGradients.ts      # Genre color mappings
        ├── useImageColors.ts      # Extract colors from images
        └── useSliderDrag.ts       # Slider drag hook
```

### Key Files Reference

| File | Purpose |
|------|---------|
| `src/api/subsonic.ts` | All Subsonic API calls (ping, getMusicDirectory, getAlbum, search3, etc.) |
| `src/store/useStore.ts` | Central Zustand store with all state slices |
| `src/store/useAudioSync.ts` | Hook to sync HTML5 audio element with store |
| `src/App.tsx` | React Router configuration with protected routes |
| `src/components/Layout/Layout.tsx` | Main layout with sidebar navigation and player bar |

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

The main store (`src/store/useStore.ts`) contains these slices:

### Audio Slice
- `isPlaying`, `currentTrack`, `currentIndex`
- `volume`, `isMuted`, `repeatMode`, `isShuffled`
- `position` (current playback position)
- Actions: play, pause, skip, seek, setVolume, toggleMute, etc.

### Queue Slice
- `queue` (array of tracks)
- `history` (previously played tracks)
- Actions: addToQueue, playNext, clearQueue, removeFromQueue, reorderQueue

### Library Slice
- `albums`, `artists`, `playlists`, `genres`
- `favorites` (starred albums/artists)
- Loading states for each category

### Settings Slice
- `serverUrl`, `username`, `password` (connection details)
- `isConnected` (connection status)
- `scrobbleThreshold` (percentage of track before scrobble)

---

## 🚀 Development

### Prerequisites
- Node.js 20+
- npm

### Commands
```bash
npm install      # Install dependencies
npm run dev      # Start dev server at http://localhost:5173
npm run build    # Build for production (outputs to dist/)
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
- Sidebar with sections: Home, Library (Albums/Artists/Playlists/Genres/Favorites), Queue, Settings
- Breadcrumb navigation in library views
- Bottom player bar (persistent)

### Styling
- Custom CSS (no framework)
- Google Fonts: Fraunces (headings), DM Sans (body)
- CSS variables for colors
- Responsive grid layouts

### Component Patterns
- `TrackRow` - Standard track listing with menu
- `AlbumCard` / `ArtistCard` - Grid card components
- `CoverArt` - Handles cover art loading and placeholders
- `QueueItem` - Queue track display
- `TrackMenu` - Context menu for track actions

---

## 🔍 Code Conventions

### TypeScript
- Strict mode enabled
- Explicit types for API responses
- Interface definitions for Subsonic API types

### React
- Functional components with hooks
- TypeScript interfaces for props
- Custom hooks in `utils/hooks/`

### File Organization
- Pages in `src/pages/` with subdirectories per route
- Shared components in `src/components/`
- Store in `src/store/` with slice-based organization
- API client in `src/api/`

### Naming
- PascalCase for components and types
- camelCase for variables and functions
- `Page` suffix for route-level components (e.g., `HomePage`)

---

## 🛠️ Key Utilities

| Utility | Location | Purpose |
|---------|----------|---------|
| `useImageColors` | `src/utils/useImageColors.ts` | Extract dominant colors from images |
| `useSliderDrag` | `src/utils/useSliderDrag.ts` | Handle slider drag interactions |
| `genreGradients` | `src/utils/genreGradients.ts` | Predefined color gradients per genre |

---

## 📡 External Dependencies

### Runtime
- `react` & `react-dom` - UI library
- `react-router-dom` - Client-side routing
- `@tanstack/react-virtual` - Virtual scrolling
- `zustand` - State management

### Build
- `vite` - Build tool
- `@vitejs/plugin-react` - React plugin for Vite
- `typescript` - Type checking
- `@types/react`, `@types/react-dom` - Type definitions

---

## 🎯 Common Tasks for Agents

### Adding a New Page
1. Create component in `src/pages/NewPage/NewPage.tsx`
2. Add route in `src/App.tsx`
3. Add navigation link in sidebar (if needed)

### Adding API Endpoint
1. Add function to `src/api/subsonic.ts`
2. Add corresponding store actions in `src/store/useStore.ts`
3. Use in components via `useStore`

### Adding New State
1. Extend interface in `src/store/useStore.ts`
2. Add initial state
3. Add reducers/actions
4. Export selectors as needed

### Styling Components
- Add tokens/global rules to `src/styles/tokens.css` or `src/styles/base.css`; component/page styles live under `src/styles/components/` and `src/styles/pages/`. Register new files in `src/styles/index.css`.
- Use inline styles or CSS classes for component-specific styles
- Follow existing color scheme and typography

---

## ⚠️ Important Notes

1. **Authentication**: Password is hashed client-side using Subsonic token auth. Never send plain text passwords.
2. **Connection Storage**: Credentials stored in browser localStorage.
3. **Server URL**: If `https://` is omitted, it's added automatically.
4. **Responsive Design**: Targets desktop and tablet screens (not mobile-optimized).
5. **Virtual Scrolling**: Used for large lists (albums, tracks) via `@tanstack/react-virtual`.
6. **Audio Element**: Managed as singleton in `src/store/audioElement.ts`.

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
| Add new route | `src/App.tsx` |
| Modify API calls | `src/api/subsonic.ts` |
| Update state logic | `src/store/useStore.ts` |
| Change audio behavior | `src/store/useAudioSync.ts` |
| Modify layout | `src/components/Layout/Layout.tsx` |
| Update global tokens | `src/styles/tokens.css` (then `src/styles/index.css` if adding files) |
| Add custom hook | `src/utils/` |
| Add shared component | `src/components/` |
| Add new page | `src/pages/` |

---

*Last updated: Project initialization*
*Maintain this file as the project evolves.*
