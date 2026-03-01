import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Layout from './components/Layout';
import AdminDashboard from './pages/admin/Dashboard';
import Users from './pages/admin/Users';
import Listings from './pages/admin/Listings';
import CollectionPoints from './pages/admin/CollectionPoints';
import Analytics from './pages/admin/Analytics';
import PostListing from './pages/PostListing';
import RegionalDashboard from './pages/regional/Dashboard';
import RegionalOrders from './pages/regional/Orders';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('gc_token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="admin/dashboard" element={<AdminDashboard />} />
        <Route path="admin/users" element={<Users />} />
        <Route path="admin/listings" element={<Listings />} />
        <Route path="admin/collection-points" element={<CollectionPoints />} />
        <Route path="admin/analytics" element={<Analytics />} />
        <Route path="post-listing" element={<PostListing />} />
        <Route path="regional/dashboard" element={<RegionalDashboard />} />
        <Route path="regional/orders" element={<RegionalOrders />} />
      </Route>
    </Routes>
  );
}
