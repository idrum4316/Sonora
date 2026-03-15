import { useCallback, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { NowPlayingPage } from '../../pages/NowPlaying/NowPlayingPage';
import { Sidebar } from './Sidebar';
import { PlayerBar } from './PlayerBar';

export function Layout() {
  const location = useLocation();
  const showNowPlaying = useStore(s => s.showNowPlaying);
  const [mounted, setMounted] = useState(false);

  // Mount when opening; unmount only after exit transition ends
  if (showNowPlaying && !mounted) setMounted(true);

  const handleTransitionEnd = useCallback(() => {
    if (!showNowPlaying) setMounted(false);
  }, [showNowPlaying]);

  return (
    <div className="app">
      <Sidebar />
      <main className="main" id="main-content" tabIndex={-1}>
        <div className="page-transition" key={location.pathname}>
          <Outlet />
        </div>
      </main>
      <PlayerBar />
      <div
        className={`np-overlay${showNowPlaying ? ' open' : ''}`}
        onTransitionEnd={handleTransitionEnd}
      >
        {mounted && <NowPlayingPage />}
      </div>
    </div>
  );
}
