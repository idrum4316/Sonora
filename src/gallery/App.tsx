import { useStore } from '../core/store';
import { Connect } from './views/Connect';
import { Shell } from './views/Shell';

export function App() {
  const isConnected = useStore(s => s.isConnected);
  return isConnected ? <Shell /> : <Connect />;
}
