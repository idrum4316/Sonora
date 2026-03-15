# Sonora

A modern, self-hosted web client for [Navidrome](https://www.navidrome.org/) and other [Subsonic-compatible](http://www.subsonic.org/pages/api.jsp) music servers.

Built with React, TypeScript, and Vite. Runs anywhere — in a Docker container, behind a reverse proxy, or standalone.

![MIT License](https://img.shields.io/badge/license-MIT-blue)

---

## Features

- **Full playback controls** — play, pause, skip, seek, shuffle, repeat (all / one), volume, and mute
- **Queue management** — add tracks, reorder with drag-and-drop, play next, clear queue, view play history
- **Now Playing view** — full-screen player with large album art, animated gradient background, and queue panel
- **Library browsing** — albums, artists, playlists, genres, and favorites with sort options (newest, recent, random, starred, frequent)
- **Search** — full-text search across artists, albums, songs, and genres with recent search history
- **Favorites** — star and unstar tracks and albums, synced to your server
- **Playlists** — browse and play playlists from your Navidrome library
- **Genre exploration** — visual genre cards with dynamic gradient colors
- **Scrobbling** — configurable scrobble threshold
- **Library management** — trigger quick or full scans from the settings page
- **Responsive UI** — works on desktop and tablet-sized screens
- **Virtual scrolling** — handles large libraries efficiently
- **Keyboard accessible** — arrow key seeking, proper ARIA labels, semantic HTML

---

## Quick Start with Docker

The fastest way to get Sonora running alongside your Navidrome server:

```yaml
services:
  sonora:
    build: .
    ports:
      - "8080:80"
    restart: unless-stopped
```

```bash
docker compose up -d
```

Then open `http://localhost:8080` in your browser and enter your Navidrome server URL, username, and password.

### Pre-built image

If you prefer to build the image yourself:

```bash
docker build -t sonora .
docker run -d -p 8080:80 --restart unless-stopped sonora
```

---

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- npm

### Install & Run

```bash
npm install
npm run dev
```

The dev server starts at `http://localhost:5173` with hot reload.

### Build for Production

```bash
npm run build
```

Output goes to `dist/`. Serve it with any static file server — the included Dockerfile uses nginx with a config that supports client-side routing.

---

## Connecting to Your Server

When you first open Sonora, you'll see a connect screen. Enter:

| Field      | Description                                      |
|------------|--------------------------------------------------|
| Server URL | Your Navidrome address (e.g. `https://music.example.com`) |
| Username   | Your Navidrome username                          |
| Password   | Your Navidrome password                          |

Sonora authenticates using the Subsonic API token scheme — your password is hashed client-side and never sent in plain text. Credentials are stored in your browser's local storage.

> **Tip:** If you omit `https://`, Sonora will add it automatically.

---

## Tech Stack

| Layer         | Technology                          |
|---------------|-------------------------------------|
| Framework     | React 18 + TypeScript               |
| Build         | Vite                                |
| Routing       | React Router v6                     |
| State         | Zustand (with persistence)          |
| Virtualization| TanStack React Virtual              |
| Server API    | Subsonic REST API v1.16.1           |
| Production    | Docker + nginx                      |

---

## Project Structure

```
src/
├── api/           # Subsonic API client
├── components/    # Shared UI components (CoverArt, TrackRow, Layout, PlayerBar, Sidebar)
├── pages/         # Route-level pages (Home, Search, Library, Album, Artist, etc.)
├── store/         # Zustand store, audio element, sync hook
├── styles/        # Global CSS
└── utils/         # Hooks and helpers (image colors, slider drag, genre gradients)
```

---

## License

[MIT](LICENSE)
