import { useEffect, useState } from 'react';
import { FiCheck, FiStar, FiZap } from 'react-icons/fi';
import { toast } from 'react-toastify';
import api from '../services/api';
import useAuthStore from '../store/authStore';

const defaultPlans = [
  {
    name: 'Free',
    price: 0,
    period: 'forever',
    features: ['5 listings per month', 'Basic search visibility', 'Standard support', 'View market prices'],
    recommended: false,
    icon: <FiStar />,
  },
  {
    name: 'Dealer Pro',
    price: 2999,
    period: 'month',
    features: ['Unlimited listings', 'Priority search placement', 'Geo-zone analytics', 'Verified dealer badge', 'Phone support', 'Real-time notifications'],
    recommended: true,
    icon: <FiZap />,
  },
  {
    name: 'Franchise',
    price: 9999,
    period: 'month',
    features: ['Everything in Dealer Pro', 'Multi-zone access', 'Custom pricing engine', 'Bulk order management', 'API access', 'Dedicated account manager', 'Priority listing review'],
    recommended: false,
    icon: <FiStar />,
  },
];

export default function Subscriptions() {
  const user = useAuthStore((s) => s.user);
  const [plans, setPlans] = useState(defaultPlans);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/subscriptions/plans')
      .then((res) => {
        if (res.data?.data?.length > 0) setPlans(res.data.data);
      })
      .catch(() => {});
  }, []);

  const handleSubscribe = async (plan) => {
    if (!user) {
      toast.info('Please login first');
      return;
    }
    if (plan.price === 0) {
      toast.info('You are on the Free plan');
      return;
    }
    setLoading(true);
    try {
      await api.post('/subscriptions', { planId: plan.id || plan.name });
      toast.success(`Subscribed to ${plan.name} plan!`);
    } catch {
      toast.error('Subscription failed. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-900">Subscription Plans</h1>
        <p className="text-gray-500 mt-2">Choose the right plan for your business. All prices in ₨ PKR.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div key={plan.name}
            className={`card p-6 flex flex-col relative
              ${plan.recommended ? 'ring-2 ring-primary-500 shadow-lg' : ''}`}>
            {plan.recommended && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-600 text-white text-xs font-semibold px-4 py-1 rounded-full">
                RECOMMENDED
              </div>
            )}

            <div className="text-center mb-6 pt-2">
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3 
                ${plan.recommended ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-600'}`}>
                {plan.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
              <div className="mt-3">
                <span className="text-3xl font-bold text-gray-900">
                  {plan.price === 0 ? 'Free' : `₨ ${plan.price.toLocaleString()}`}
                </span>
                {plan.price > 0 && (
                  <span className="text-gray-500 text-sm">/{plan.period}</span>
                )}
              </div>
            </div>

            <ul className="space-y-3 flex-1 mb-6">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <FiCheck className="text-primary-600 mt-0.5 flex-shrink-0" size={16} />
                  <span className="text-gray-600">{f}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSubscribe(plan)}
              disabled={loading}
              className={`w-full py-2.5 rounded-lg font-medium text-sm transition-colors
                ${plan.recommended
                  ? 'bg-primary-600 text-white hover:bg-primary-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              {plan.price === 0 ? 'Current Plan' : 'Subscribe Now'}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center text-sm text-gray-500">
        <p>All plans can be cancelled anytime. Payments are processed securely.</p>
        <p className="mt-1">For custom enterprise plans, contact us at <strong>+92-300-1234567</strong></p>
      </div>
    </div>
  );
}
