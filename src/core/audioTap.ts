import { audio } from '../core/audio';
import { useStore } from '../core/store';

/**
 * Frequency levels of the playing track, for the spectrum displays.
 *
 * This taps a captured copy of the audio rather than routing the element through Web Audio. A media
 * element source goes silent if a track turns out not to allow CORS, while the element's own output
 * doesn't depend on a capture at all, so nothing here can stop the music. Browsers that can't capture
 * (Firefox and Safari, for now) get a decorative pattern from `readLevels` instead.
 */

const FFT_SIZE = 4096;
const MIN_HZ = 40;
const MAX_HZ = 14000;

let context: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let source: MediaStreamAudioSourceNode | null = null;
let track: MediaStreamTrack | null = null;
let bins: Uint8Array<ArrayBuffer> | null = null;
let binsReadAt = -1;
let unavailable = false;

const element = audio as HTMLAudioElement & { captureStream?: () => MediaStream };

function giveUp() {
  unavailable = true;
  source?.disconnect();
  source = null;
  track = null;
  analyser = null;
  void context?.close();
  context = null;
}

/** Listens to the element's current source. Each source needs a capture of its own. */
function connect() {
  if (unavailable || !element.captureStream) return;
  try {
    if (!context || !analyser) {
      context = new AudioContext();
      analyser = context.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      analyser.smoothingTimeConstant = 0.62;
      analyser.minDecibels = -82;
      analyser.maxDecibels = -16;
      bins = new Uint8Array(analyser.frequencyBinCount);
    }
    void context.resume();
    if (track) return;
    const live = element.captureStream().getAudioTracks().find(t => t.readyState === 'live');
    if (!live) return;
    source?.disconnect();
    source = context.createMediaStreamSource(new MediaStream([live]));
    source.connect(analyser);
    track = live;
  } catch {
    // Most likely a track from a server without CORS, which can't be captured.
    giveUp();
  }
}

/** The element moved to a new source. The old capture stays live but silent, so let go of it. */
function onEmptied() {
  track?.stop();
  track = null;
}

/**
 * A server can allow CORS on its API but not its streams, and then a CORS request for a stream fails
 * outright. The music matters more than the display, so play without CORS from then on.
 */
function onError() {
  if (!audio.crossOrigin || !audio.getAttribute('src')) return;
  if (audio.error?.code !== MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) return;
  audio.crossOrigin = null;
  giveUp();
  audio.load();
  if (useStore.getState().isPlaying) audio.play().catch(console.error);
}

const onPause = () => { void context?.suspend(); };

/** Call once at startup, before anything plays. Returns a function that stops listening. */
export function startAudioTap(): () => void {
  if (!element.captureStream) return () => {};
  // A capture needs a CORS request. The API already needs CORS, so a working server very likely allows it.
  audio.crossOrigin = 'anonymous';
  audio.addEventListener('playing', connect);
  audio.addEventListener('pause', onPause);
  audio.addEventListener('emptied', onEmptied);
  audio.addEventListener('error', onError);
  return () => {
    audio.removeEventListener('playing', connect);
    audio.removeEventListener('pause', onPause);
    audio.removeEventListener('emptied', onEmptied);
    audio.removeEventListener('error', onError);
  };
}

const edgeCache = new Map<number, number[]>();

/** Where each of `count` bands starts, as a position in `bins`. Spaced like pitch, not like Hz. */
function bandEdges(count: number, binHz: number): number[] {
  let edges = edgeCache.get(count);
  if (!edges) {
    edges = Array.from({ length: count + 1 }, (_, i) => (MIN_HZ * (MAX_HZ / MIN_HZ) ** (i / count)) / binHz);
    edgeCache.set(count, edges);
  }
  return edges;
}

function binAt(data: Uint8Array, position: number): number {
  const low = Math.floor(position);
  const mix = position - low;
  return data[low] * (1 - mix) + (data[low + 1] ?? 0) * mix;
}

function readReal(levels: Float32Array, now: number) {
  if (!analyser || !bins || !context) return;
  // Several displays can share a frame, so read the audio once per frame.
  if (now !== binsReadAt) {
    analyser.getByteFrequencyData(bins);
    binsReadAt = now;
  }
  const edges = bandEdges(levels.length, context.sampleRate / FFT_SIZE);
  for (let band = 0; band < levels.length; band++) {
    const start = edges[band];
    const end = edges[band + 1];
    let peak = binAt(bins, (start + end) / 2);
    for (let bin = Math.ceil(start); bin < end; bin++) peak = Math.max(peak, bins[bin] ?? 0);
    // Music has far less energy up high, so lift those bands to keep the whole display alive.
    const tilt = 1 + 0.32 * (band / levels.length);
    const value = Math.min(1, (peak / 255) * tilt);
    levels[band] = value * value * (1.6 - 0.6 * value);
  }
}

/** Slow, music-shaped motion. It isn't audio data, so it's only for when there's none to show. */
export function readDecorative(levels: Float32Array, now: number) {
  const t = now / 1000;
  const pulse = Math.max(0, Math.sin(t * 3.4)) ** 6;
  for (let band = 0; band < levels.length; band++) {
    const x = band / levels.length;
    const shape = 0.1 + 0.62 * (1 - x) ** 1.4;
    const drift = 0.5 + 0.5 * Math.sin(t * (0.9 + x * 2.3) + band * 0.37) * Math.sin(t * 0.53 + band * 0.11);
    levels[band] = shape * (0.35 + 0.65 * drift) * (0.82 + 0.3 * pulse * (1 - x));
  }
}

/** Fills `levels` with 0–1 per band, lowest pitch first. `now` is the animation frame's timestamp. */
export function readLevels(levels: Float32Array, now: number) {
  if (analyser) readReal(levels, now);
  else readDecorative(levels, now);
}
