import { useState, type FormEvent } from 'react';
import { useStore } from '../../store/useStore';
import { ThemeToggle } from '../../components/ThemeToggle';
import { ping } from '../../api/subsonic';
import type { SubsonicConfig } from '../../api/subsonic';

const IconLogo = () => (
  <svg width="48" height="48" viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <circle cx="14" cy="14" r="12" stroke="currentColor" strokeWidth="1.5" />
    <path d="M9 18 Q14 8 19 18" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    <circle cx="14" cy="14" r="2.5" fill="currentColor" />
  </svg>
);

const IconCheck = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconAlert = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const IconArrow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

export function ConnectPage() {
  const setConfig = useStore(s => s.setConfig);
  const [serverUrl, setServerUrl] = useState('http://localhost:4533');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverInfo, setServerInfo] = useState('');

  async function handleConnect(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setServerInfo('');
    setLoading(true);

    let normalizedUrl = serverUrl.trim().replace(/\/$/, '');
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = 'https://' + normalizedUrl;
    }

    const config: SubsonicConfig = {
      serverUrl: normalizedUrl,
      username: username.trim(),
      password,
    };

    try {
      const info = await ping(config);
      const typeStr = info.type ? ` · ${info.type}` : '';
      const versionStr = info.serverVersion ? ` ${info.serverVersion}` : '';
      setServerInfo(`Connected${typeStr}${versionStr}`);
      setTimeout(() => setConfig(config), 400);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not connect. Check your server URL and credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="connect-page">
      <header className="connect-topbar">
        <div className="connect-wordmark" aria-label="Sonora">
          <span className="connect-wordmark-icon">
            <IconLogo />
          </span>
          <span>Sonora</span>
        </div>
        <ThemeToggle className="connect-theme-toggle" showLabel />
      </header>

      <main className="connect-shell">
        <section className="connect-intro" aria-labelledby="connect-title">
          <p className="connect-eyebrow">Self-hosted music streaming</p>
          <h1 id="connect-title" className="connect-title">Connect to your library.</h1>
          <p className="connect-copy">
            Sonora pairs with Navidrome and Subsonic-compatible servers for a quiet,
            fast listening experience that keeps your collection in focus.
          </p>
          <ul className="connect-proof-list" aria-label="Connection features">
            <li><IconCheck /> Subsonic API compatible</li>
            <li><IconCheck /> Token-authenticated requests</li>
            <li><IconCheck /> Preferences saved on this device</li>
          </ul>
        </section>

        <section className="connect-panel" aria-label="Server login">
          <div className="connect-panel-header">
            <p className="connect-step">Subsonic API</p>
            <h2>Server login</h2>
            <p>Enter your server details to start browsing and playing your library.</p>
          </div>

          <form onSubmit={handleConnect} className="connect-form" noValidate>
            <div className="connect-field">
              <label htmlFor="server-url">Server URL</label>
              <input
                id="server-url"
                className="connect-input"
                type="url"
                value={serverUrl}
                onChange={e => setServerUrl(e.target.value)}
                placeholder="https://your-server:4533"
                required
                autoFocus
                autoComplete="url"
                aria-describedby={error ? 'connect-error' : undefined}
              />
            </div>

            <div className="connect-field">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                className="connect-input"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="admin"
                required
                autoComplete="username"
              />
            </div>

            <div className="connect-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                className="connect-input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div id="connect-error" className="connect-status connect-status-error" role="alert">
                <IconAlert />
                <span>{error}</span>
              </div>
            )}

            {serverInfo && (
              <div className="connect-status connect-status-success" role="status">
                <IconCheck />
                <span>{serverInfo}</span>
              </div>
            )}

            <button
              type="submit"
              className="connect-submit"
              disabled={loading || !serverUrl || !username || !password}
            >
              {loading ? (
                <>
                  <span className="connect-spinner" aria-hidden="true" />
                  Connecting…
                </>
              ) : (
                <>
                  Connect
                  <IconArrow />
                </>
              )}
            </button>
          </form>

          <p className="connect-note">
            Credentials are saved locally in this browser and used for Subsonic token authentication.
          </p>
        </section>
      </main>
    </div>
  );
}
