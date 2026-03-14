import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import { useAudioSync } from './store/useAudioSync';
import { Layout } from './components/Layout/Layout';
import { ConnectPage } from './pages/Connect/ConnectPage';
import { HomePage } from './pages/Home/HomePage';
import { AlbumPage } from './pages/Album/AlbumPage';
import { ArtistPage } from './pages/Artist/ArtistPage';
import { PlaylistPage } from './pages/Playlist/PlaylistPage';
import { LibraryPage } from './pages/Library/LibraryPage';
import { SearchPage } from './pages/Search/SearchPage';
import { NowPlayingPage } from './pages/NowPlaying/NowPlayingPage';
import { QueuePage } from './pages/Queue/QueuePage';
import { GenrePage } from './pages/Genre/GenrePage';
import { SettingsPage } from './pages/Settings/SettingsPage';

function ProtectedLayout() {
  const isConnected = useStore(s => s.isConnected);
  if (!isConnected) return <Navigate to="/connect" replace />;
  return <Layout />;
}

export function App() {
  const isConnected = useStore(s => s.isConnected);

  // Sync HTML5 Audio element → Zustand store (always active)
  useAudioSync();

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/connect"
          element={isConnected ? <Navigate to="/" replace /> : <ConnectPage />}
        />
        <Route
          path="/now-playing"
          element={isConnected ? <NowPlayingPage /> : <Navigate to="/connect" replace />}
        />
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/album/:id" element={<AlbumPage />} />
          <Route path="/artist/:id" element={<ArtistPage />} />
          <Route path="/playlist/:id" element={<PlaylistPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/genre/:name" element={<GenrePage />} />
          <Route path="/queue" element={<QueuePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to={isConnected ? '/' : '/connect'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
