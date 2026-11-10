import { useEffect, useRef, useState, type FormEvent } from 'react';
import { connect } from '../../core/connect';
import { useStore } from '../../core/store';
import { PixelField } from '../widgets/pixelField';

/** The way in: a wall of drifting light, waiting for a library to show. */
export function Connect() {
  const setConfig = useStore(s => s.setConfig);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [serverUrl, setServerUrl] = useState('http://localhost:4533');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  useEffect(() => {
    const field = new PixelField(canvasRef.current!, { demo: true });
    return () => field.dispose();
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const { config, info } = await connect(serverUrl, username, password);
      const server = [info.type, info.serverVersion].filter(Boolean).join(' ');
      setMessage({ text: `Connected${server ? ` to ${server}` : ''}`, isError: false });
      setTimeout(() => setConfig(config), 600);
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : 'Could not connect', isError: true });
      setBusy(false);
    }
  }

  return (
    <main className="g-connect">
      <canvas ref={canvasRef} className="g-connect-field" aria-hidden="true" />
      <div className="g-connect-vignette" aria-hidden="true" />
      <div className="g-connect-inner">
        <div className="g-connect-brand">
          <span className="g-wordmark-grid is-big" aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <i key={i} />)}</span>
          <h1 className="g-connect-title">sonora<em>gallery</em></h1>
          <p className="g-lede">Your library, seen. Every cover on one wall, sorted by color, time and name, with the music lighting the room.</p>
        </div>
        <form className="g-connect-form" onSubmit={handleSubmit}>
          <label className="g-field">
            <span>Server</span>
            <input value={serverUrl} onChange={e => setServerUrl(e.target.value)} required autoComplete="url" spellCheck={false} />
          </label>
          <label className="g-field">
            <span>Username</span>
            <input value={username} onChange={e => setUsername(e.target.value)} required autoFocus autoComplete="username" spellCheck={false} />
          </label>
          <label className="g-field">
            <span>Password</span>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
          </label>
          <button className="g-pill is-accent is-big g-connect-go" type="submit" disabled={busy}>
            {busy ? 'Connecting…' : 'Enter the gallery'}
          </button>
          <p className={`g-connect-message${message?.isError ? ' is-error' : ''}`} role="status">{message?.text}</p>
          <p className="g-connect-alt">Prefer something quieter? <a href="/">Classic</a> · <a href="/terminal/">Terminal</a></p>
        </form>
      </div>
    </main>
  );
}
