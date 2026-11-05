import { ping } from './subsonic';
import type { SubsonicConfig } from './subsonic';

export interface ConnectResult {
  config: SubsonicConfig;
  info: { serverVersion?: string; type?: string };
}

/**
 * Normalizes the server details and verifies them with a ping. Rejects if the
 * server can't be reached. Doesn't store the config, so the UI can show the
 * result before calling setConfig, which marks the app as connected.
 */
export async function connect(serverUrl: string, username: string, password: string): Promise<ConnectResult> {
  let normalizedUrl = serverUrl.trim().replace(/\/$/, '');
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = 'https://' + normalizedUrl;
  }
  const config: SubsonicConfig = { serverUrl: normalizedUrl, username: username.trim(), password };
  const info = await ping(config);
  return { config, info };
}
