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
import Languages from './pages/Languages';
import Units from './pages/Units';
import Countries from './pages/Countries';
import Payments from './pages/Payments';
import Subscriptions from './pages/Subscriptions';
import Analytics from './pages/Analytics';
import Notifications from './pages/Notifications';
import Territories from './pages/Territories';
import DealerOnboarding from './pages/DealerOnboarding';
import BalanceManagement from './pages/BalanceManagement';
import CollectionsAdmin from './pages/Collections';
import CarbonAnalytics from './pages/CarbonAnalytics';
import KycReview from './pages/KycReview';
import MarketplaceHome from './pages/MarketplaceHome';
import MarketplaceListings from './pages/MarketplaceListings';
import CreateListing from './pages/CreateListing';
import ListingDetail from './pages/ListingDetail';
import Profile from './pages/Profile';
import ChatInbox from './pages/ChatInbox';
import Chat from './pages/Chat';
import TransactionsApp from './pages/TransactionsApp';
import TransactionDetail from './pages/TransactionDetail';
import Wallet from './pages/Wallet';

import { tokenStore } from './services/api-client';

function ProtectedRoute({ children }) {
  // Check both new and old token keys for backward compatibility
  const token = tokenStore.get();
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
        <Route path="catalog/units" element={<Units />} />
        <Route path="listings" element={<Listings />} />
        <Route path="geo-zones" element={<GeoZones />} />
        <Route path="territories" element={<Territories />} />
        <Route path="dealer-onboarding" element={<DealerOnboarding />} />
        <Route path="kyc-review" element={<KycReview />} />
        <Route path="balance-management" element={<BalanceManagement />} />
        <Route path="languages" element={<Languages />} />
        <Route path="translations" element={<Translations />} />
        <Route path="currencies" element={<Currencies />} />
        <Route path="countries" element={<Countries />} />
        <Route path="payments" element={<Payments />} />
        <Route path="subscriptions" element={<Subscriptions />} />
        <Route path="collections" element={<CollectionsAdmin />} />
        <Route path="carbon-analytics" element={<CarbonAnalytics />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="notifications" element={<Notifications />} />
        {/* Marketplace — same experience as mobile app */}
        <Route path="marketplace" element={<MarketplaceHome />} />
        <Route path="marketplace/listings" element={<MarketplaceListings />} />
        <Route path="marketplace/create" element={<CreateListing />} />
        <Route path="marketplace/listing/:id" element={<ListingDetail />} />
        <Route path="marketplace/profile" element={<Profile />} />
        <Route path="marketplace/chat" element={<ChatInbox />} />
        <Route path="marketplace/chat/:userId" element={<Chat />} />
        <Route path="marketplace/transactions" element={<TransactionsApp />} />
        <Route path="marketplace/transactions/:id" element={<TransactionDetail />} />
        <Route path="marketplace/wallet" element={<Wallet />} />
      </Route>
    </Routes>
  );
}
