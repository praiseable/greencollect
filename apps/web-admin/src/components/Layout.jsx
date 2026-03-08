import { useState, useEffect, useCallback } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FiHome, FiUsers, FiGrid, FiList, FiMapPin, FiGlobe,
  FiDollarSign, FiCreditCard, FiBarChart2, FiBell, FiLogOut,
  FiMenu, FiX, FiChevronDown, FiChevronRight, FiPackage, FiSettings
} from 'react-icons/fi';
import { getNotifications, markAllRead } from '../services/api';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: FiHome },
  { to: '/users', label: 'Users', icon: FiUsers },
  {
    label: 'Catalog',
    icon: FiPackage,
    children: [
      { to: '/catalog/categories', label: 'Categories' },
      { to: '/catalog/product-types', label: 'Product Types' },
      { to: '/catalog/units', label: 'Units' },
    ],
  },
  { to: '/listings', label: 'Listings', icon: FiList },
  { to: '/geo-zones', label: 'Geo Zones', icon: FiMapPin },
  {
    label: 'Localization',
    icon: FiGlobe,
    children: [
      { to: '/languages', label: 'Languages' },
      { to: '/translations', label: 'Translations' },
      { to: '/countries', label: 'Countries' },
    ],
  },
  { to: '/currencies', label: 'Currencies', icon: FiDollarSign },
  { to: '/payments', label: 'Payments', icon: FiSettings },
  { to: '/subscriptions', label: 'Subscriptions', icon: FiCreditCard },
  { to: '/analytics', label: 'Analytics', icon: FiBarChart2 },
  { to: '/notifications', label: 'Notifications', icon: FiBell },
];

export default function Layout() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const user = JSON.parse(localStorage.getItem('admin_user') || '{}');

  const fetchNotifs = useCallback(async () => {
    try {
      const res = await getNotifications({ unread: true, limit: 10 });
      setNotifications(res.data?.notifications || res.data || []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchNotifs();
    const iv = setInterval(fetchNotifs, 30000);
    return () => clearInterval(iv);
  }, [fetchNotifs]);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    toast.info('Logged out');
    navigate('/login');
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
      setNotifications([]);
      toast.success('All notifications marked as read');
    } catch { /* ignore */ }
  };

  const unreadCount = Array.isArray(notifications) ? notifications.filter(n => !n.isRead).length : 0;

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
      isActive
        ? 'bg-primary-600 text-white shadow-md'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    }`;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
        <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
          <span className="text-white font-bold text-lg">G</span>
        </div>
        {sidebarOpen && (
          <div>
            <h1 className="font-bold text-gray-900 text-lg leading-tight">GreenCollect</h1>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest">Admin Portal</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) =>
          item.children ? (
            <div key={item.label}>
              <button
                onClick={() => setOpenSubmenu(openSubmenu === item.label ? '' : item.label)}
                className="flex items-center justify-between w-full px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all"
              >
                <span className="flex items-center gap-3">
                  <item.icon size={18} />
                  {sidebarOpen && item.label}
                </span>
                {sidebarOpen && (openSubmenu === item.label ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />)}
              </button>
              {openSubmenu === item.label && sidebarOpen && (
                <div className="ml-8 mt-1 space-y-1">
                  {item.children.map((sub) => (
                    <NavLink key={sub.to} to={sub.to} className={linkClass}>
                      {sub.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <NavLink key={item.to} to={item.to} className={linkClass}>
              <item.icon size={18} />
              {sidebarOpen && item.label}
            </NavLink>
          )
        )}
      </nav>

      {/* User */}
      <div className="border-t border-gray-100 p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-semibold text-sm">
            {user.firstName?.[0]}{user.lastName?.[0]}
          </div>
          {sidebarOpen && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-gray-400 truncate">{user.role?.name || 'Admin'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col bg-white border-r border-gray-100 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'}`}>
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                if (window.innerWidth >= 1024) setSidebarOpen(!sidebarOpen);
                else setMobileSidebarOpen(!mobileSidebarOpen);
              }}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
            >
              {mobileSidebarOpen ? <FiX size={20} /> : <FiMenu size={20} />}
            </button>
            <h2 className="text-lg font-semibold text-gray-800 hidden sm:block">
              Administration Panel
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 relative"
              >
                <FiBell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifDropdown && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead} className="text-xs text-primary-600 hover:underline">Mark all read</button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="p-4 text-sm text-gray-400 text-center">No new notifications</p>
                    ) : (
                      notifications.slice(0, 8).map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            setShowNotifDropdown(false);
                            if (n.actionUrl) navigate(n.actionUrl);
                          }}
                          className={`px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition ${!n.isRead ? 'bg-primary-50/50' : ''}`}
                        >
                          <p className="text-sm font-medium text-gray-800">{n.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-gray-400 mt-1">
                            {new Date(n.createdAt).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="px-4 py-2 border-t border-gray-100">
                    <button
                      onClick={() => { setShowNotifDropdown(false); navigate('/notifications'); }}
                      className="text-xs text-primary-600 hover:underline w-full text-center"
                    >
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Logout */}
            <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition" title="Logout">
              <FiLogOut size={20} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
