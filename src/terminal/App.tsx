import { useStore } from '../core/store';
import { Connect } from './widgets/Connect';
import { Shell } from './views/Shell';

export function App() {
  const isConnected = useStore(s => s.isConnected);
  return isConnected ? <Shell /> : <Connect />;
}
