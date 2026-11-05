import { useState, type FormEvent } from 'react';
import { connect } from '../../core/connect';
import { useStore } from '../../core/store';
import { Logo } from './Logo';
import { Spectrum, type CellSize } from './Spectrum';

const BACKDROP_CELL: CellSize = { width: 6, height: 3, gapX: 3, gapY: 3 };
/** Long enough to read the success message, and for the screen to fade into the app. */
const CONNECTED_MS = 520;

export function Connect() {
  const setConfig = useStore(s => s.setConfig);
  const [serverUrl, setServerUrl] = useState('http://localhost:4533');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const { config, info } = await connect(serverUrl, username, password);
      const server = [info.type, info.serverVersion].filter(Boolean).join(' ');
      setMessage({ text: `connected${server ? ` to ${server}` : ''}`, isError: false });
      setConnected(true);
      // Leave the success message up briefly; setConfig swaps this screen for the app.
      setTimeout(() => setConfig(config), CONNECTED_MS);
    } catch (err) {
      const text = err instanceof Error ? err.message : 'could not connect';
      setMessage({ text, isError: true });
      setBusy(false);
    }
  }

  return (
    <main className={`t-connect${connected ? ' is-connected' : ''}`}>
      <Spectrum className="t-connect-spectrum" cell={BACKDROP_CELL} demo />
      <Logo animated />
      <p className="t-tagline">a keyboard-first client for navidrome<i className="t-caret" /></p>
      <form className="t-pane t-connect-form" onSubmit={handleSubmit}>
        <h1 className="t-pane-title">connect</h1>
        <label className="t-field">
          <span>server</span>
          <input value={serverUrl} onChange={e => setServerUrl(e.target.value)} required autoComplete="url" spellCheck={false} />
        </label>
        <label className="t-field">
          <span>user</span>
          <input value={username} onChange={e => setUsername(e.target.value)} required autoFocus autoComplete="username" spellCheck={false} />
        </label>
        <label className="t-field">
          <span>password</span>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
        </label>
        <div className="t-connect-actions">
          <button className="t-button" type="submit" disabled={busy}>
            <kbd>enter</kbd> {busy ? 'connecting…' : 'connect'}
          </button>
          <a className="t-link" href="/">classic ui</a>
        </div>
      </form>
      <p className={`t-connect-message${message?.isError ? ' is-error' : ''}`} role="status">{message?.text}</p>
    </main>
  );
}
