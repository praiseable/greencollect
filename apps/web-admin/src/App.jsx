import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Categories from './pages/Categories';
import ProductTypes from './pages/ProductTypes';
import Listings from './pages/Listings';
import GeoZones from './pages/GeoZones';
import Translations from './pages/Translations';
import Currencies from './pages/Currencies';
import Subscriptions from './pages/Subscriptions';
import Analytics from './pages/Analytics';
import Notifications from './pages/Notifications';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('admin_token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="users" element={<Users />} />
        <Route path="catalog/categories" element={<Categories />} />
        <Route path="catalog/product-types" element={<ProductTypes />} />
        <Route path="listings" element={<Listings />} />
        <Route path="geo-zones" element={<GeoZones />} />
        <Route path="translations" element={<Translations />} />
        <Route path="currencies" element={<Currencies />} />
        <Route path="subscriptions" element={<Subscriptions />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="notifications" element={<Notifications />} />
      </Route>
    </Routes>
  );
}
