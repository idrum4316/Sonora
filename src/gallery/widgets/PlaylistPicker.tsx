import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { plural } from '../../core/format';
import { useStore } from '../../core/store';
import { addToPlaylist, createPlaylist, getPlaylists, type Playlist } from '../../core/subsonic';
import { useUi, type PlaylistPick } from '../ui';
import { Cover } from './Cover';
import { CloseIcon, PlusIcon } from './Icons';

/** Whether this user can change a playlist. Servers only let owners edit theirs. */
export function ownsPlaylist(playlist: Pick<Playlist, 'owner'>, username: string | undefined): boolean {
  return !playlist.owner || !username || playlist.owner.toLowerCase() === username.toLowerCase();
}

function errorText(e: unknown): string {
  return e instanceof Error ? e.message : 'the server said no';
}

/** Adds songs to one of your playlists, or to a new one. Opened with `openPick` from anywhere. */
export function PlaylistPicker() {
  const pick = useUi(s => s.pick);
  if (!pick) return null;
  return <Picker pick={pick} />;
}

function Picker({ pick }: { pick: PlaylistPick }) {
  const config = useStore(s => s.config);
  const closePick = useUi(s => s.closePick);
  const showToast = useUi(s => s.showToast);
  const [playlists, setPlaylists] = useState<Playlist[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const songIds = pick.songs.map(s => s.id);
  const what = pick.songs.length === 1 ? pick.title : plural(pick.songs.length, 'track');

  useEffect(() => {
    if (!config) return;
    let live = true;
    getPlaylists(config)
      .then(all => live && setPlaylists(all.filter(p => ownsPlaylist(p, config.username))))
      .catch(() => { if (live) { setPlaylists([]); setLoadError(true); } });
    return () => { live = false; };
  }, [config]);

  // Takes focus while open, and hands it back to whatever opened it.
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    panelRef.current?.focus({ preventScroll: true });
    return () => before?.focus?.({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (naming) inputRef.current?.focus({ preventScroll: true });
  }, [naming]);

  const finish = (text: string) => {
    useStore.getState().bumpPlaylistVersion();
    showToast(text);
    // Unless it was closed meanwhile and opened again for something else.
    if (useUi.getState().pick === pick) closePick();
  };

  const add = async (playlist: Playlist) => {
    if (!config || busy) return;
    setBusy(playlist.id);
    try {
      await addToPlaylist(config, playlist.id, songIds);
      finish(`Added ${what} to ${playlist.name}`);
    } catch (e) {
      // Long lists go in batches, so even a failure may have changed the playlist.
      useStore.getState().bumpPlaylistVersion();
      showToast(`Couldn't add to ${playlist.name}: ${errorText(e)}`);
      setBusy(null);
      panelRef.current?.focus({ preventScroll: true });
    }
  };

  const create = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!config || busy || !trimmed) return;
    setBusy('new');
    try {
      await createPlaylist(config, trimmed, songIds);
      finish(`Created ${trimmed} with ${what}`);
    } catch (err) {
      useStore.getState().bumpPlaylistVersion();
      showToast(`Couldn't create ${trimmed}: ${errorText(err)}`);
      setBusy(null);
      panelRef.current?.focus({ preventScroll: true });
    }
  };

  // Keys stay in here, so the gallery's own keys don't play, skip or fly about behind it.
  const onKeyDown = (e: ReactKeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Escape') {
      e.preventDefault();
      if (naming && !busy) { setNaming(false); setName(''); panelRef.current?.focus({ preventScroll: true }); }
      else closePick();
    }
    if (e.key === 'Tab') trapTab(e, panelRef.current);
  };

  return (
    <div className="g-pick" onPointerDown={e => { if (e.target === e.currentTarget) closePick(); }}>
      <div
        ref={panelRef}
        className="g-pick-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="g-pick-title"
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        <header className="g-pick-head">
          <Cover coverArt={pick.coverArt} size={160} className="g-pick-art" />
          <div className="g-pick-what">
            <span className="g-eyebrow">Add to playlist</span>
            <h2 id="g-pick-title">{pick.title}</h2>
            <span className="g-pick-sub">
              {[pick.subtitle, pick.songs.length > 1 ? plural(pick.songs.length, 'track') : null].filter(Boolean).join(' · ')}
            </span>
          </div>
          <button className="g-icon-btn" onClick={closePick} aria-label="Close"><CloseIcon size={18} /></button>
        </header>

        <div className="g-pick-list">
          {naming ? (
            <form className="g-pick-new is-naming" onSubmit={create}>
              <span className="g-pick-tile"><PlusIcon size={20} /></span>
              <input
                ref={inputRef}
                value={name}
                placeholder="New playlist name"
                aria-label="New playlist name"
                maxLength={120}
                spellCheck={false}
                disabled={!!busy}
                onChange={e => setName(e.target.value)}
              />
              <button type="submit" className="g-pill is-accent" disabled={!name.trim() || !!busy}>
                {busy === 'new' ? 'Creating…' : 'Create'}
              </button>
            </form>
          ) : (
            <button className="g-pick-new" onClick={() => setNaming(true)} disabled={!!busy}>
              <span className="g-pick-tile"><PlusIcon size={20} /></span>
              <span className="g-pick-name">New playlist</span>
            </button>
          )}

          {playlists === null && <p className="g-pick-note">Loading your playlists…</p>}
          {loadError && <p className="g-pick-note">Couldn't load your playlists. You can still start a new one.</p>}
          {playlists?.length === 0 && !loadError && <p className="g-pick-note">No playlists of yours yet. Start one above.</p>}
          {playlists?.map(p => (
            <button key={p.id} className="g-pick-row" onClick={() => void add(p)} disabled={!!busy}>
              <Cover coverArt={p.coverArt} size={96} className="g-pick-tile" />
              <span className="g-pick-name">{p.name}</span>
              <span className="g-mono g-dim">{busy === p.id ? 'Adding…' : plural(p.songCount, 'track')}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Keeps Tab cycling through the dialog's own controls. */
function trapTab(e: ReactKeyboardEvent, panel: HTMLElement | null) {
  if (!panel) return;
  const focusable = Array.from(panel.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)'));
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;
  if (e.shiftKey && (active === first || active === panel)) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
}
