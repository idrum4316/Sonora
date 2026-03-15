import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { Song } from '../api/subsonic';
import { useStore } from '../store/useStore';

/* ── Icons ──────────────────────────────────────────────────── */

const IconMore = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="12" cy="5" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="12" cy="19" r="2" />
  </svg>
);

const IconPlayNext = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="5,3 15,12 5,21" fill="currentColor" stroke="none" />
    <line x1="19" y1="5" x2="19" y2="19" />
  </svg>
);

const IconAddQueue = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

/* ── Dropdown menu ──────────────────────────────────────────── */

interface MenuPosition { x: number; y: number }

function TrackDropdown({ song, position, onClose }: {
  song: Song;
  position: MenuPosition;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const addToQueue = useStore(s => s.addToQueue);
  const playNext = useStore(s => s.playNext);

  // Adjust position if menu overflows viewport
  const [adjusted, setAdjusted] = useState(position);

  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let { x, y } = position;
    if (x + rect.width > window.innerWidth - 8) x = window.innerWidth - rect.width - 8;
    if (y + rect.height > window.innerHeight - 8) y = window.innerHeight - rect.height - 8;
    if (x < 8) x = 8;
    if (y < 8) y = 8;
    setAdjusted({ x, y });
  }, [position]);

  // Close on Escape, outside click, scroll
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    const handleScroll = () => onClose();

    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [onClose]);

  const handlePlayNext = () => { playNext(song); onClose(); };
  const handleAddToQueue = () => { addToQueue(song); onClose(); };

  return createPortal(
    <div
      ref={menuRef}
      className="track-menu"
      role="menu"
      aria-label={`Options for ${song.title}`}
      style={{ left: adjusted.x, top: adjusted.y }}
    >
      <button className="track-menu-item" role="menuitem" onClick={handlePlayNext}>
        <IconPlayNext /> Play Next
      </button>
      <button className="track-menu-item" role="menuitem" onClick={handleAddToQueue}>
        <IconAddQueue /> Add to Queue
      </button>
    </div>,
    document.body,
  );
}

/* ── More button (three-dot trigger) ────────────────────────── */

export function TrackMoreButton({ song, className }: { song: Song; className?: string }) {
  const [menu, setMenu] = useState<MenuPosition | null>(null);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenu({ x: rect.right - 4, y: rect.bottom + 4 });
  }, []);

  const close = useCallback(() => setMenu(null), []);

  return (
    <>
      <button
        className={`track-more-btn${className ? ` ${className}` : ''}`}
        aria-label={`More options for ${song.title}`}
        aria-haspopup="menu"
        aria-expanded={!!menu}
        onClick={handleClick}
      >
        <IconMore />
      </button>
      {menu && <TrackDropdown song={song} position={menu} onClose={close} />}
    </>
  );
}

/* ── Context-menu hook for right-click on rows ──────────────── */

export function useTrackMenu() {
  const [state, setState] = useState<{ song: Song; pos: MenuPosition } | null>(null);

  const openMenu = useCallback((e: React.MouseEvent, song: Song) => {
    e.preventDefault();
    e.stopPropagation();
    setState({ song, pos: { x: e.clientX, y: e.clientY } });
  }, []);

  const close = useCallback(() => setState(null), []);

  const menuPortal = state
    ? <TrackDropdown song={state.song} position={state.pos} onClose={close} />
    : null;

  return { openMenu, menuPortal };
}
