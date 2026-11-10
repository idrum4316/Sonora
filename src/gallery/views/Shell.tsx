import { useEffect } from 'react';
import { useStore } from '../../core/store';
import { paletteStyle, useNowPalette } from '../hooks';
import { useGallery } from '../library';
import { back, go, useRoute } from '../router';
import { useUi } from '../ui';
import { Atlas } from '../wall/Atlas';
import { Dock } from '../widgets/Player';
import { QueuePanel, Toast } from '../widgets/QueuePanel';
import { AlbumView } from './AlbumView';
import { ArtistView } from './ArtistView';
import { PlaylistsView, PlaylistView } from './PlaylistViews';
import { Stage } from './Stage';
import { TopBar } from './TopBar';

/**
 * The atlas is always there, underneath. Other views open over it, so coming back finds it just as it
 * was left, and it stops drawing while it's covered.
 */
export function Shell() {
  const route = useRoute();
  const load = useGallery(s => s.load);
  const status = useGallery(s => s.status);
  const hasTrack = useStore(s => !!s.currentTrack);

  const palette = useNowPalette();

  useEffect(() => {
    if (status === 'idle') void load();
  }, [status, load]);

  // Disconnecting unmounts the shell; the next server starts from scratch.
  useEffect(() => () => useGallery.setState({ albums: [], status: 'idle', query: '', genre: null, starredOnly: false, unheardOnly: false, touring: false }), []);

  useEffect(() => {
    if (route.view === 'atlas') document.title = 'Sonora Gallery';
    // Each view starts at its top.
    if (route.view !== 'atlas') document.querySelector('.g-page')?.scrollTo(0, 0);
  }, [route]);

  useGlobalKeys(route.view);

  const pageKey = route.view === 'album' || route.view === 'artist' || route.view === 'playlist' ? `${route.view}:${route.id}` : route.view;

  return (
    <div className={`g-shell is-${route.view}${hasTrack ? ' has-track' : ''}`} style={paletteStyle(palette)}>
      <div className="g-ambient" aria-hidden="true" />
      <Atlas active={route.view === 'atlas'} />
      <div className="g-layer" key={pageKey}>
        {route.view === 'album' && <AlbumView id={route.id} />}
        {route.view === 'artist' && <ArtistView id={route.id} />}
        {route.view === 'playlists' && <PlaylistsView />}
        {route.view === 'playlist' && <PlaylistView id={route.id} />}
        {route.view === 'stage' && <Stage />}
      </div>
      <TopBar route={route} />
      {route.view !== 'stage' && <Dock />}
      <QueuePanel />
      <Toast />
    </div>
  );
}

function useGlobalKeys(view: string) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement;
      if (target.closest('input, textarea, select')) return;
      const store = useStore.getState();
      const ui = useUi.getState();
      switch (e.key) {
        case ' ':
          if (target.closest('button, a, [role="slider"]')) return;
          e.preventDefault();
          store.togglePlay();
          break;
        case 'n': store.next(); break;
        case 'p': store.prev(); break;
        case 'q': ui.setQueueOpen(!ui.queueOpen); break;
        case 'f':
          if (view === 'stage') back();
          else go('/now');
          break;
        case 'Escape':
          if (ui.queueOpen) ui.setQueueOpen(false);
          else if (useGallery.getState().touring) useGallery.getState().setTouring(false);
          else if (view !== 'atlas') back();
          else if (useGallery.getState().query) useGallery.getState().setQuery('');
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view]);
}
