import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getTransaction, getTransactionBond, acceptTransaction, rejectTransaction, finalizeTransaction } from '../services/api';
import { toast } from 'react-toastify';

export default function TransactionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tx, setTx] = useState(null);
  const [bond, setBond] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(false);

  useEffect(() => {
    if (!id) return;
    getTransaction(id)
      .then((res) => setTx(res.data))
      .catch(() => setTx(null))
      .finally(() => setLoading(false));
    getTransactionBond(id).then((res) => setBond(res.data)).catch(() => setBond(null));
  }, [id]);

  const doAccept = async () => {
    setActioning(true);
    try {
      await acceptTransaction(id);
      toast.success('Offer accepted');
      getTransaction(id).then((res) => setTx(res.data));
    } catch (e) {
      toast.error(e.response?.data?.error?.message || 'Failed');
    } finally {
      setActioning(false);
    }
  };
  const doReject = async () => {
    if (!confirm('Reject this offer?')) return;
    setActioning(true);
    try {
      await rejectTransaction(id, {});
      toast.success('Offer rejected');
      navigate('/marketplace/transactions');
    } catch (e) {
      toast.error(e.response?.data?.error?.message || 'Failed');
    } finally {
      setActioning(false);
    }
  };

  if (loading || !id) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
      </div>
    );
  }
  if (!tx) {
    return (
      <div className="card py-12 text-center text-gray-500">
        Transaction not found. <Link to="/marketplace/transactions" className="text-green-600 hover:underline">Back to list</Link>
      </div>
    );
  }

  const priceStr = (p) => (p != null ? `₨ ${(Number(p) / 100).toLocaleString()}` : '—');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="btn-secondary text-sm">Back</button>
        <h1 className="text-xl font-bold text-gray-900">Transaction</h1>
      </div>
      <div className="card space-y-4">
        <p><span className="text-gray-500">Listing:</span> {tx.listing?.title}</p>
        <p><span className="text-gray-500">Status:</span> <span className="badge badge-yellow">{tx.status}</span></p>
        <p><span className="text-gray-500">Offered:</span> {priceStr(tx.offeredPricePaisa)}</p>
        {tx.finalPricePaisa != null && <p><span className="text-gray-500">Final:</span> {priceStr(tx.finalPricePaisa)}</p>}
        <p><span className="text-gray-500">Buyer:</span> {tx.buyer?.firstName} {tx.buyer?.lastName} {tx.buyer?.phone && `• ${tx.buyer.phone}`}</p>
        {bond && (
          <div className="rounded-lg border border-gray-200 p-3">
            <p className="text-sm font-medium text-gray-700">Bond / Agreement</p>
            <pre className="mt-2 whitespace-pre-wrap text-xs text-gray-600">{JSON.stringify(bond, null, 2)}</pre>
          </div>
        )}
        <div className="flex gap-2 pt-4">
          {['OFFERED', 'OFFER_MADE'].includes(tx.status) && (
            <>
              <button onClick={doAccept} className="btn-primary" disabled={actioning}>Accept</button>
              <button onClick={doReject} className="btn-danger" disabled={actioning}>Reject</button>
            </>
          )}
          <Link to="/marketplace/transactions" className="btn-secondary">Back to list</Link>
        </div>
      </div>
    </div>
  );
}
