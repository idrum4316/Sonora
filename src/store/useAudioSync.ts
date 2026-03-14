import { useEffect } from 'react';
import { useStore } from './useStore';
import { audio } from './audioElement';
import { scrobble } from '../api/subsonic';

/** Syncs the HTML5 Audio element events → Zustand store. Call once at app root. */
export function useAudioSync() {
  const setCurrentTime = useStore(s => s.setCurrentTime);
  const setDuration = useStore(s => s.setDuration);
  const setIsPlaying = useStore(s => s.setIsPlaying);

  useEffect(() => {
    let scrobbled = false;

    const onTimeUpdate = () => {
      const t = audio.currentTime;
      setCurrentTime(t);

      // Scrobble once when the track passes the threshold percentage
      if (!scrobbled && audio.duration > 0) {
        const { config, currentTrack, scrobbleThreshold } = useStore.getState();
        const pct = (t / audio.duration) * 100;
        if (config && currentTrack && pct >= scrobbleThreshold) {
          scrobbled = true;
          scrobble(config, currentTrack.id).catch(console.error);
        }
      }
    };
    const onDurationChange = () => setDuration(audio.duration);
    const onPlay = () => { setIsPlaying(true); scrobbled = false; };
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      const { config, currentTrack, repeat, next } = useStore.getState();
      // Scrobble if we haven't already (e.g. very short track or threshold = 100)
      if (!scrobbled && config && currentTrack) {
        scrobble(config, currentTrack.id).catch(console.error);
      }
      scrobbled = false;
      if (repeat === 'one') { audio.currentTime = 0; audio.play().catch(console.error); }
      else next();
    };
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
    };
  }, [setCurrentTime, setDuration, setIsPlaying]);
}
