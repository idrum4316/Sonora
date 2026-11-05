import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../../core/store';
import { getPlaylists, createPlaylist, addToPlaylist } from '../../core/subsonic';

import type { Playlist } from '../../core/subsonic';
import { CoverArt, artClass } from './CoverArt';

/* ── Icons ──────────────────────────────────────────────────── */
const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconPlaylist = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

/* ── State type for success feedback ────────────────────────── */
type DialogState = 'idle' | 'loading' | 'creating' | 'adding' | 'success';

/* ── Dialog ─────────────────────────────────────────────────── */
export function AddToPlaylistDialog({
  songIds,
  onClose,
}: {
  songIds: string[];
  onClose: () => void;
}) {
  const config = useStore(s => s.config)!;
  const bumpPlaylistVersion = useStore(s => s.bumpPlaylistVersion);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [state, setState] = useState<DialogState>('loading');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [successName, setSuccessName] = useState('');

  // Load playlists
  useEffect(() => {
    getPlaylists(config)
      .then(pls => { setPlaylists(pls); setState('idle'); })
      .catch(() => setState('idle'));
  }, [config]);

  // Focus input when create form opens
  useEffect(() => {
    if (showCreate) inputRef.current?.focus();
  }, [showCreate]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Close on backdrop click
  const handleBackdrop = useCallback((e: React.MouseEvent) => {
    if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
  }, [onClose]);

  // Add to an existing playlist
  const handleAdd = useCallback(async (pl: Playlist) => {
    setState('adding');
    try {
      await addToPlaylist(config, pl.id, songIds);
      bumpPlaylistVersion();
      setSuccessName(pl.name);
      setState('success');
      setTimeout(onClose, 900);
    } catch (err) {
      console.error(err);
      setState('idle');
    }
  }, [config, songIds, onClose]);

  // Create new playlist and add songs
  const handleCreate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    setState('creating');
    try {
      await createPlaylist(config, trimmed, songIds);
      bumpPlaylistVersion();
      setSuccessName(trimmed);
      setState('success');
      setTimeout(onClose, 900);
    } catch (err) {
      console.error(err);
      setState('idle');
    }
  }, [config, songIds, newName, onClose]);

  const busy = state === 'loading' || state === 'adding' || state === 'creating';

  return createPortal(
    <div className="playlist-dialog-backdrop" onMouseDown={handleBackdrop}>
      <div ref={panelRef} className="playlist-dialog" role="dialog" aria-label="Add to playlist">
        {/* Success state */}
        {state === 'success' ? (
          <div className="playlist-dialog-success">
            <div className="playlist-dialog-success-icon"><IconCheck /></div>
            <p>Added to <strong>{successName}</strong></p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="playlist-dialog-header">
              <h2>Add to Playlist</h2>
              <span className="playlist-dialog-count">
                {songIds.length} {songIds.length === 1 ? 'track' : 'tracks'}
              </span>
            </div>

            {/* Create new */}
            {showCreate ? (
              <form className="playlist-dialog-create" onSubmit={handleCreate}>
                <input
                  ref={inputRef}
                  className="playlist-dialog-input"
                  type="text"
                  placeholder="Playlist name…"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  disabled={busy}
                  maxLength={120}
                />
                <div className="playlist-dialog-create-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => { setShowCreate(false); setNewName(''); }}
                    disabled={busy}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={!newName.trim() || busy}
                  >
                    {state === 'creating' ? 'Creating…' : 'Create'}
                  </button>
                </div>
              </form>
            ) : (
              <button
                className="playlist-dialog-new-btn"
                onClick={() => setShowCreate(true)}
                disabled={busy}
              >
                <div className="playlist-dialog-new-icon"><IconPlus /></div>
                New Playlist
              </button>
            )}

            {/* Divider */}
            <div className="playlist-dialog-divider" />

            {/* Playlist list */}
            <div className="playlist-dialog-list">
              {state === 'loading' ? (
                <div className="playlist-dialog-loading">Loading playlists…</div>
              ) : playlists.length === 0 ? (
                <div className="playlist-dialog-empty">
                  <IconPlaylist />
                  <p>No playlists yet</p>
                </div>
              ) : (
                playlists.map(pl => (
                  <button
                    key={pl.id}
                    className="playlist-dialog-item"
                    onClick={() => handleAdd(pl)}
                    disabled={busy}
                  >
                    <div className={`playlist-dialog-item-art ${artClass(pl.id)}`}>
                      {pl.coverArt ? (
                        <CoverArt coverArt={pl.coverArt} id={pl.id} size={40} alt="" />
                      ) : (
                        <IconPlaylist />
                      )}
                    </div>
                    <div className="playlist-dialog-item-info">
                      <div className="playlist-dialog-item-name">{pl.name}</div>
                      <div className="playlist-dialog-item-meta">
                        {pl.songCount} {pl.songCount === 1 ? 'track' : 'tracks'}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
