import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">G</span>
              </div>
              <span className="text-lg font-bold text-white">GreenCollect</span>
            </div>
            <p className="text-sm text-gray-400">Pakistan's leading marketplace for recyclable and reusable goods. Trade scrap metals, plastics, electronics and more.</p>
            <p className="text-sm text-gray-500 mt-2">🇵🇰 Made in Pakistan</p>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-3">Marketplace</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/listings" className="hover:text-white">Browse Listings</Link></li>
              <li><Link to="/create-listing" className="hover:text-white">Post a Listing</Link></li>
              <li><Link to="/subscriptions" className="hover:text-white">Subscription Plans</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-3">Categories</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/listings?category=metals" className="hover:text-white">Metals (دھاتیں)</Link></li>
              <li><Link to="/listings?category=plastics" className="hover:text-white">Plastics (پلاسٹک)</Link></li>
              <li><Link to="/listings?category=paper" className="hover:text-white">Paper (کاغذ)</Link></li>
              <li><Link to="/listings?category=electronics" className="hover:text-white">Electronics (الیکٹرانکس)</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-3">Contact</h4>
            <ul className="space-y-2 text-sm">
              <li>📞 +92-300-1234567</li>
              <li>✉️ support@marketplace.pk</li>
              <li>📍 Karachi, Pakistan</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-6 text-sm text-center text-gray-500">
          © {new Date().getFullYear()} GreenCollect Marketplace. All rights reserved. | Currency: ₨ PKR
        </div>
      </div>
    </footer>
  );
}
