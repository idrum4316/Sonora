import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { PlayerBar } from './PlayerBar';

export function Layout() {
  const location = useLocation();

  return (
    <div className="app">
      <Sidebar />
      <main className="main" id="main-content" tabIndex={-1}>
        <div className="page-transition" key={location.pathname}>
          <Outlet />
        </div>
      </main>
      <PlayerBar />
    </div>
  );
}
