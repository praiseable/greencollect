import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { FiMenu, FiX, FiBell, FiPlus, FiUser, FiLogOut, FiSearch } from 'react-icons/fi';
import useAuthStore from '../store/authStore';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/listings?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    setMenuOpen(false);
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">G</span>
            </div>
            <span className="text-xl font-bold text-gray-900">GreenCollect</span>
          </Link>

          {/* Search bar (desktop) */}
          <form onSubmit={handleSearch} className="hidden md:flex items-center flex-1 max-w-lg mx-8">
            <div className="relative w-full">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search listings... (e.g. copper, plastic, iron)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
              />
            </div>
          </form>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/listings" className="text-gray-600 hover:text-gray-900 text-sm font-medium px-3 py-2">
              Browse
            </Link>
            {user ? (
              <>
                <Link to="/create-listing" className="btn-primary flex items-center gap-1.5 text-sm !py-2 !px-4">
                  <FiPlus size={16} /> Post Listing
                </Link>
                <Link to="/notifications" className="relative p-2 text-gray-500 hover:text-gray-700">
                  <FiBell size={20} />
                </Link>
                <Link to="/dashboard" className="p-2 text-gray-500 hover:text-gray-700">
                  <FiUser size={20} />
                </Link>
                <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500">
                  <FiLogOut size={18} />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-600 hover:text-gray-900 text-sm font-medium px-3 py-2">Login</Link>
                <Link to="/register" className="btn-primary text-sm !py-2 !px-4">Register</Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t">
          <form onSubmit={handleSearch} className="p-4">
            <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field" />
          </form>
          <div className="px-4 pb-4 space-y-2">
            <Link to="/listings" className="block py-2 text-gray-700" onClick={() => setMenuOpen(false)}>Browse Listings</Link>
            {user ? (
              <>
                <Link to="/create-listing" className="block py-2 text-primary-600 font-medium" onClick={() => setMenuOpen(false)}>+ Post Listing</Link>
                <Link to="/dashboard" className="block py-2 text-gray-700" onClick={() => setMenuOpen(false)}>Dashboard</Link>
                <Link to="/notifications" className="block py-2 text-gray-700" onClick={() => setMenuOpen(false)}>Notifications</Link>
                <Link to="/profile" className="block py-2 text-gray-700" onClick={() => setMenuOpen(false)}>Profile</Link>
                <button onClick={handleLogout} className="block w-full text-left py-2 text-red-500">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" className="block py-2 text-gray-700" onClick={() => setMenuOpen(false)}>Login</Link>
                <Link to="/register" className="block py-2 text-primary-600 font-medium" onClick={() => setMenuOpen(false)}>Register</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
