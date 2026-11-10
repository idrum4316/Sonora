import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useStore } from '../../../core/store';
import { ThemeToggle } from '../../components/ThemeToggle';
import { AccentPicker } from '../../components/AccentPicker';
import { ping, startScan, getScanStatus } from '../../../core/subsonic';
import type { ScanStatus } from '../../../core/subsonic';

export function SettingsPage() {
  const config = useStore(s => s.config);
  const clearConfig = useStore(s => s.clearConfig);
  const scrobbleThreshold = useStore(s => s.scrobbleThreshold);
  const setScrobbleThreshold = useStore(s => s.setScrobbleThreshold);
  const navigate = useNavigate();

  const [serverInfo, setServerInfo] = useState<{ version?: string; type?: string } | null>(null);
  const [scanStatus, setScanStatus] = useState<ScanStatus | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  // A fresh start counts too: the reply to startScan may say a fast scan isn't running.
  const scanActive = scanLoading || !!scanStatus?.scanning;

  // Fetch server info on mount
  useEffect(() => {
    if (!config) return;
    ping(config)
      .then(info => setServerInfo({ version: info.serverVersion, type: info.type }))
      .catch(console.error);
    getScanStatus(config)
      .then(setScanStatus)
      .catch(console.error);
  }, [config]);

  // Poll scan status while a scan is starting or running
  useEffect(() => {
    if (!config || !scanActive) return;
    const poll = setInterval(() => {
      getScanStatus(config).then(s => {
        setScanStatus(s);
        if (!s.scanning) setScanLoading(false);
      }).catch(e => {
        console.error(e);
        setScanLoading(false);
      });
    }, 2000);
    return () => clearInterval(poll);
  }, [config, scanActive]);

  const handleScan = useCallback(async (fullScan: boolean) => {
    if (!config) return;
    setScanLoading(true);
    try {
      const status = await startScan(config, fullScan);
      setScanStatus(status);
    } catch (e) {
      console.error(e);
      setScanLoading(false);
    }
  }, [config]);

  const handleDisconnect = useCallback(() => {
    if (confirm('Disconnect from this server?')) {
      clearConfig();
      navigate('/connect');
    }
  }, [clearConfig, navigate]);

  const serverUrl = config?.serverUrl ?? '';
  const username = config?.username ?? '';

  return (
    <div className="settings-page page-pad">
      <h1 className="settings-title">Settings</h1>

      {/* ── Appearance ── */}
      <section className="settings-section">
        <h2 className="settings-section-title">Appearance</h2>
        <div className="settings-card">
          <div className="settings-row">
            <span className="settings-label">Theme</span>
            <ThemeToggle className="settings-theme-toggle" showLabel />
          </div>
          <div className="settings-row settings-row-accent">
            <span className="settings-label">Accent color</span>
            <AccentPicker />
          </div>
          <div className="settings-row">
            <span className="settings-label">Interface</span>
            <div className="settings-interfaces">
              <a className="btn btn-secondary" href="/gallery/">Gallery UI</a>
              <a className="btn btn-secondary" href="/terminal/">Terminal UI</a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Server Info ── */}
      <section className="settings-section">
        <h2 className="settings-section-title">Server</h2>
        <div className="settings-card">
          <div className="settings-row">
            <span className="settings-label">URL</span>
            <span className="settings-value">{serverUrl}</span>
          </div>
          <div className="settings-row">
            <span className="settings-label">User</span>
            <span className="settings-value">{username}</span>
          </div>
          {serverInfo && (
            <>
              {serverInfo.type && (
                <div className="settings-row">
                  <span className="settings-label">Type</span>
                  <span className="settings-value">{serverInfo.type}</span>
                </div>
              )}
              {serverInfo.version && (
                <div className="settings-row">
                  <span className="settings-label">Version</span>
                  <span className="settings-value">{serverInfo.version}</span>
                </div>
              )}
            </>
          )}
          <div className="settings-row settings-row-action">
            <button className="btn btn-secondary settings-disconnect-btn" onClick={handleDisconnect}>
              <IconLogout />
              Disconnect
            </button>
          </div>
        </div>
      </section>

      {/* ── Library Scan ── */}
      <section className="settings-section">
        <h2 className="settings-section-title">Library Scan</h2>
        <p className="settings-description">
          Trigger the server to scan for new or changed music files.
          A <strong>quick scan</strong> checks for changes since the last scan.
          A <strong>full scan</strong> re-reads all files from scratch.
        </p>
        <div className="settings-card">
          {scanStatus?.scanning && (
            <div className="settings-scan-status">
              <span className="settings-scan-spinner" />
              Scanning{scanStatus.count != null ? ` · ${scanStatus.count} items` : '…'}
            </div>
          )}
          <div className="settings-row settings-row-action settings-scan-buttons">
            <button
              className="btn btn-primary"
              disabled={scanActive}
              onClick={() => handleScan(false)}
            >
              Quick Scan
            </button>
            <button
              className="btn btn-secondary"
              disabled={scanActive}
              onClick={() => handleScan(true)}
            >
              Full Scan
            </button>
          </div>
        </div>
      </section>

      {/* ── Scrobble Threshold ── */}
      <section className="settings-section">
        <h2 className="settings-section-title">Scrobble</h2>
        <p className="settings-description">
          Choose how far into a track you need to listen before it's marked as played on the server.
        </p>
        <div className="settings-card">
          <div className="settings-row settings-row-slider">
            <span className="settings-label">Scrobble at</span>
            <div className="settings-slider-wrap">
              <input
                type="range"
                min={10}
                max={100}
                step={5}
                value={scrobbleThreshold}
                onChange={e => setScrobbleThreshold(Number(e.target.value))}
                className="settings-slider"
                aria-label="Scrobble threshold percentage"
              />
              <span className="settings-slider-value">{scrobbleThreshold}%</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

const IconLogout = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
