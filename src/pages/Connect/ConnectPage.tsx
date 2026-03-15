import { useState, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { ping } from '../../api/subsonic';
import type { SubsonicConfig } from '../../api/subsonic';

const IconLogo = () => (
  <svg width="48" height="48" viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <circle cx="14" cy="14" r="12" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M9 18 Q14 8 19 18" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    <circle cx="14" cy="14" r="2.5" fill="currentColor"/>
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
  const urlRef = useRef<HTMLInputElement>(null);

  async function handleConnect(e: React.FormEvent) {
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
    <div style={styles.page}>
      {/* Background orbs */}
      <div style={styles.orb1} aria-hidden="true" />
      <div style={styles.orb2} aria-hidden="true" />

      <div style={styles.card} role="main">
        <div style={styles.logoWrap}>
          <div style={styles.logoIcon}>
            <IconLogo />
          </div>
          <h1 style={styles.logoName}>Sonora</h1>
          <p style={styles.tagline}>A beautiful client for your Navidrome server</p>
        </div>

        <form onSubmit={handleConnect} style={styles.form} noValidate>
          <div style={styles.field}>
            <label htmlFor="server-url" style={styles.label}>Server URL</label>
            <input
              ref={urlRef}
              id="server-url"
              type="url"
              value={serverUrl}
              onChange={e => setServerUrl(e.target.value)}
              placeholder="https://your-server:4533"
              style={styles.input}
              required
              autoFocus
              autoComplete="url"
              aria-describedby={error ? 'connect-error' : undefined}
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="username" style={styles.label}>Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="admin"
              style={styles.input}
              required
              autoComplete="username"
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="password" style={styles.label}>Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={styles.input}
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div id="connect-error" role="alert" style={styles.error}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          {serverInfo && (
            <div role="status" style={styles.success}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              {serverInfo}
            </div>
          )}

          <button
            type="submit"
            style={{ ...styles.submitBtn, ...(loading ? styles.submitBtnLoading : {}) }}
            disabled={loading || !serverUrl || !username || !password}
          >
            {loading ? (
              <>
                <span style={styles.spinner} aria-hidden="true" />
                Connecting…
              </>
            ) : (
              <>
                Connect
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </>
            )}
          </button>
        </form>

        <p style={styles.hint}>
          Connects to any <strong>Navidrome</strong> or <strong>Subsonic</strong>-compatible server using the Subsonic API.
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'var(--bg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    position: 'relative',
    overflow: 'hidden',
  },
  orb1: {
    position: 'absolute',
    top: '-120px',
    left: '-120px',
    width: '500px',
    height: '500px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(123,108,246,0.25) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  orb2: {
    position: 'absolute',
    bottom: '-100px',
    right: '-100px',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(224,122,95,0.20) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  card: {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    maxWidth: '400px',
    background: 'rgba(14,16,23,0.85)',
    border: '1px solid var(--border-strong)',
    borderRadius: '24px',
    padding: '40px 36px',
    backdropFilter: 'blur(24px)',
    boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
    animation: 'fadeUp 500ms cubic-bezier(0.4,0,0.2,1) both',
  },
  logoWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '36px',
    gap: '8px',
  },
  logoIcon: {
    color: 'var(--accent)',
    marginBottom: '4px',
  },
  logoName: {
    fontFamily: 'var(--font-display)',
    fontSize: '32px',
    fontWeight: '600',
    letterSpacing: '-1px',
    color: 'var(--text-primary)',
  },
  tagline: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    textAlign: 'center',
    lineHeight: '1.5',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '12px',
    fontWeight: '600',
    letterSpacing: '0.04em',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase' as const,
  },
  input: {
    background: 'var(--surface-2)',
    border: '1px solid var(--border-strong)',
    borderRadius: '10px',
    padding: '11px 14px',
    fontSize: '14px',
    color: 'var(--text-primary)',
    outline: 'none',
    transition: 'border-color 200ms, box-shadow 200ms',
    width: '100%',
  },
  error: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 14px',
    background: 'rgba(224,122,95,0.12)',
    border: '1px solid rgba(224,122,95,0.25)',
    borderRadius: '10px',
    color: 'var(--accent)',
    fontSize: '13px',
  },
  success: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 14px',
    background: 'rgba(67,233,123,0.10)',
    border: '1px solid rgba(67,233,123,0.25)',
    borderRadius: '10px',
    color: '#43e97b',
    fontSize: '13px',
  },
  submitBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '13px 20px',
    background: 'var(--text-primary)',
    color: 'var(--bg)',
    border: 'none',
    borderRadius: '999px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 200ms, transform 200ms, box-shadow 200ms',
    marginTop: '4px',
  },
  submitBtnLoading: {
    opacity: 0.7,
    cursor: 'not-allowed',
  },
  spinner: {
    display: 'inline-block',
    width: '14px',
    height: '14px',
    border: '2px solid rgba(0,0,0,0.2)',
    borderTopColor: 'rgba(0,0,0,0.8)',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
  hint: {
    marginTop: '24px',
    fontSize: '12px',
    color: 'var(--text-tertiary)',
    textAlign: 'center' as const,
    lineHeight: '1.6',
  },
};
