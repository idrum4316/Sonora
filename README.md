# 🎵 Sonora

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/react-18+-61DAFB.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/typescript-5+-3178C6.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/vite-6+-646CFF.svg)](https://vitejs.dev/)

**Sonora** is a modern, self-hosted web client for [Navidrome](https://www.navidrome.org/) and other [Subsonic-compatible](http://www.subsonic.org/pages/api.jsp) music streaming servers.

Built with React, TypeScript, and Vite, Sonora delivers a beautiful, responsive listening experience that works seamlessly across desktop and tablet devices. It comes with two interfaces: the classic UI, and a keyboard-first [terminal-style UI](#-terminal-ui) that also runs in your browser.

---

## ✨ Features

### 🎶 Playback
- Full playback controls: play, pause, skip, seek, shuffle, repeat (all/one)
- Volume control with mute toggle
- Queue management with drag-and-drop reordering
- Play next, clear queue, and view play history

### 📚 Library
- Browse albums, artists, playlists, genres, and favorites
- Multiple sort options: newest, recent, random, starred, frequent
- Full-text search across artists, albums, songs, and genres
- Recent search history for quick access

### ❤️ Personalization
- Star and unstar tracks and albums (synced to server)
- Browse and play server playlists
- Visual genre cards with dynamic gradient colors
- Configurable scrobble threshold

### ⚙️ Administration
- Trigger quick or full library scans from settings
- Responsive design for desktop and tablet screens
- Efficient virtual scrolling for large libraries
- Keyboard accessible with proper ARIA labels

---

## ⌨️ Terminal UI

Sonora also includes a terminal-styled interface at `/terminal/` (for example, `http://localhost:8080/terminal/`). It runs in the browser and uses the same connection, theme, and accent as the classic UI. You can switch between them from either UI's settings. Switching reloads the page, so playback stops and the queue clears.

Press `?` for the full list of keys. The essentials:

| Keys | Action |
|------|--------|
| `j` `k` / `h` `l` | Move up and down / between panes |
| `1`–`8` | Jump to a view |
| `Enter` | Play or open the selection |
| `a` / `N` | Add to the queue / play next |
| `f` | Star the selection |
| `A` / `b` | Go to the selection's artist / album |
| `Space`, `n`, `p` | Pause, next, previous |
| `←` `→` / `+` `-` | Seek / volume |
| `s` / `r` | Shuffle / repeat |
| `/` | Start a new search |
| `t` / `T` | Light or dark / next accent |

The player and the now playing view show a live spectrum of whatever's playing. It reads the real audio in Chromium-based browsers when your server allows CORS on streams, and otherwise shows a decorative pattern. Playback isn't affected either way.

The terminal UI doesn't cover playlist editing, library scans, or artist bios yet. Use the classic UI for those.

---

## 🚀 Quick Start

### Using Docker Compose (Recommended)

Create a `docker-compose.yml` file:

```yaml
services:
  sonora:
    build: .
    ports:
      - "8080:80"
    restart: unless-stopped
```

Then run:

```bash
docker compose up -d
```

Open `http://localhost:8080` in your browser.

### Using Docker

Build and run the image:

```bash
docker build -t sonora .
docker run -d -p 8080:80 --restart unless-stopped sonora
```

---

## 🔗 Connecting to Your Server

On first launch, you'll see a connection screen. Enter your Navidrome server details:

| Field | Description |
|-------|-------------|
| **Server URL** | Your Navidrome address (e.g., `https://music.example.com`) |
| **Username** | Your Navidrome username |
| **Password** | Your Navidrome password |

> **Note:** Sonora uses Subsonic API token authentication. Your password is hashed client-side and never sent in plain text. Credentials are stored securely in your browser's local storage.

> **Tip:** If you omit `https://`, Sonora will add it automatically.

---

## 🛠️ Development

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- npm

### Installation

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

The dev server starts at `http://localhost:5173` with hot module replacement.

### Build for Production

```bash
npm run build
```

Production-ready files are output to the `dist/` directory. Serve with any static file server — the included Docker setup uses nginx with proper routing support.

---

## 📦 Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | React 18 + TypeScript |
| **Build Tool** | Vite 6 |
| **Routing** | React Router v6 |
| **State Management** | Zustand v5 (with persistence) |
| **Virtualization** | TanStack React Virtual |
| **API** | Subsonic REST API v1.16.1 |
| **Styling** | Custom CSS with Google Fonts (Fraunces and DM Sans; JetBrains Mono in the terminal UI) |
| **Deployment** | Docker + nginx |

---

## 🗂️ Project Structure

```
index.html              # Classic UI page, served at /
terminal/index.html     # Terminal UI page, served at /terminal/
scripts/
└── check-boundaries.mjs  # Fails the build if an import crosses a UI boundary
src/
├── core/               # Shared by both UIs: no UI code
│   ├── subsonic.ts     # Subsonic API client
│   ├── store.ts        # Zustand store: connection, settings, playback, queue
│   ├── audio.ts        # The HTML audio element
│   ├── audioSync.ts    # Audio events, scrobbling, auto-advance
│   ├── appearance.ts   # Applies theme and accent
│   ├── tokens.css      # Design tokens
│   └── ...             # format, library, recentSearches, connect
├── classic/            # Classic UI
│   ├── main.tsx        # Entry point
│   ├── App.tsx         # Routes
│   ├── components/
│   ├── pages/
│   ├── styles/
│   └── utils/
└── terminal/           # Terminal UI
    ├── main.tsx        # Entry point
    ├── nav.ts          # Views, panes, cursors, loading
    ├── items.ts        # What lists show, and what each kind of row does
    ├── commands.ts     # What keys do
    ├── useKeymap.ts    # Key bindings
    ├── audioTap.ts     # Frequency levels for the spectrum
    ├── terminal.css
    ├── views/
    └── widgets/
```

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).

Copyright © 2026 Chris

---

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 🙌 Acknowledgments

- [Navidrome](https://www.navidrome.org/) - The open-source music server that Sonora is designed for
- [Subsonic API](http://www.subsonic.org/) - The API standard that makes this possible
- [Vite](https://vitejs.dev/) - Blazing fast frontend tooling
- [React](https://react.dev/) - The UI library that powers Sonora
- [Zustand](https://github.com/pmndrs/zustand) - Simple and scalable state management
