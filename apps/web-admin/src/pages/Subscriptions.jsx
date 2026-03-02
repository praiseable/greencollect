import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiCreditCard, FiCheck } from 'react-icons/fi';
import { getPlans } from '../services/api';

export default function Subscriptions() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPlans()
      .then(r => setPlans(r.data?.plans || r.data || []))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Subscription Plans</h1>
        <p className="text-sm text-gray-500 mt-1">Manage franchise subscription tiers</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" /></div>
      ) : plans.length === 0 ? (
        <div className="card text-center py-12">
          <FiCreditCard size={40} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-400">No subscription plans configured yet.</p>
          <p className="text-xs text-gray-400 mt-1">Plans are managed via the backend API or seed data.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((p) => (
            <div key={p.id} className={`card relative overflow-hidden ${p.isPopular ? 'ring-2 ring-primary-500' : ''}`}>
              {p.isPopular && (
                <div className="absolute top-0 right-0 bg-primary-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                  POPULAR
                </div>
              )}
              <div className="text-center mb-6">
                <h3 className="text-lg font-bold text-gray-900">{p.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{p.description}</p>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-primary-600">₨ {(p.price || 0).toLocaleString()}</span>
                  <span className="text-gray-500 text-sm">/{p.interval || 'month'}</span>
                </div>
              </div>
              <div className="space-y-3">
                {(p.features || []).map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <FiCheck className="text-primary-600 flex-shrink-0" size={16} />
                    {f}
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-gray-100 text-center">
                <span className="badge-blue">{p._count?.subscribers || 0} subscribers</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
