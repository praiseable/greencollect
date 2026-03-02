import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Listings from './pages/Listings';
import ListingDetail from './pages/ListingDetail';
import CreateListing from './pages/CreateListing';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import Subscriptions from './pages/Subscriptions';
import useAuthStore from './store/authStore';

function PrivateRoute({ children }) {
  const user = useAuthStore((s) => s.user);
  return user ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <Router>
      <ToastContainer position="top-right" autoClose={4000} />
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Layout wrapper */}
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/listings" element={<Listings />} />
          <Route path="/listings/:id" element={<ListingDetail />} />

          {/* Protected */}
          <Route path="/create-listing" element={<PrivateRoute><CreateListing /></PrivateRoute>} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
          <Route path="/subscriptions" element={<PrivateRoute><Subscriptions /></PrivateRoute>} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
