import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';

const adminLinks = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/post-listing', label: 'Post Listing', icon: '📸' },
  { to: '/admin/users', label: 'Users', icon: '👥' },
  { to: '/admin/listings', label: 'Listings', icon: '📦' },
  { to: '/admin/collection-points', label: 'Collection Points', icon: '🏭' },
  { to: '/admin/analytics', label: 'Analytics', icon: '📈' },
];

const regionalLinks = [
  { to: '/regional/dashboard', label: 'Inventory', icon: '🗂️' },
  { to: '/regional/orders', label: 'My Orders', icon: '🛒' },
];

export default function Layout() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const user = JSON.parse(localStorage.getItem('gc_user') || '{}');
  const isAdmin = user.role === 'admin' || user.role === 'collection_manager';

  function handleLogout() {
    localStorage.removeItem('gc_token');
    localStorage.removeItem('gc_user');
    navigate('/login');
  }

  const links = isAdmin ? [...adminLinks, ...regionalLinks] : regionalLinks;

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-emerald-800 text-white transition-all duration-300 flex flex-col`}>
        <div className="p-4 flex items-center gap-2">
          <span className="text-2xl">♻️</span>
          {sidebarOpen && <h1 className="text-lg font-bold">GreenCollect</h1>}
        </div>

        <nav className="flex-1 mt-4">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-colors ${
                  isActive ? 'bg-emerald-700 text-white' : 'text-emerald-100 hover:bg-emerald-700/50'
                }`
              }
            >
              <span className="text-lg">{link.icon}</span>
              {sidebarOpen && <span className="text-sm font-medium">{link.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-emerald-700">
          {sidebarOpen && (
            <div className="mb-2">
              <p className="text-sm font-medium">{user.name || 'User'}</p>
              <p className="text-xs text-emerald-300">{user.role}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full text-left text-sm text-emerald-200 hover:text-white transition"
          >
            {sidebarOpen ? '🚪 Logout' : '🚪'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <header className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-600 hover:text-gray-800"
          >
            ☰
          </button>
          <div className="text-sm text-gray-500">
            Welcome, {user.name || 'User'}
          </div>
        </header>

        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
