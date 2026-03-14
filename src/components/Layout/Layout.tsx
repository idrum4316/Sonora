import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { PlayerBar } from './PlayerBar';

export function Layout() {
  return (
    <div className="app">
      <Sidebar />
      <main className="main" id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      <PlayerBar />
    </div>
  );
}
