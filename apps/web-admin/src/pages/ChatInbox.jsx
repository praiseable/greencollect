import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getChatConversations } from '../services/api';

export default function ChatInbox() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getChatConversations()
      .then((res) => setConversations(Array.isArray(res.data) ? res.data : res.data?.data ?? []))
      .catch(() => setConversations([]))
      .finally(() => setLoading(false));
  }, []);

  const partnerName = (c) => {
    const u = c.user;
    if (!u) return 'Unknown';
    return [u.firstName, u.lastName].filter(Boolean).join(' ') || u.displayName || 'User';
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Chat Inbox</h1>
      {conversations.length === 0 ? (
        <div className="card py-12 text-center text-gray-500">No conversations yet. Start a chat from a listing (Message seller).</div>
      ) : (
        <div className="space-y-2">
          {conversations.map((c) => (
            <Link
              key={c.userId}
              to={`/marketplace/chat/${c.userId}`}
              className="card flex items-center gap-4 p-4 transition hover:shadow-md"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100 text-lg font-semibold text-green-700">
                {partnerName(c).charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900">{partnerName(c)}</p>
                <p className="truncate text-sm text-gray-500">{c.lastMessage || 'No messages'}</p>
              </div>
              {c.lastAt && (
                <span className="text-xs text-gray-400">
                  {new Date(c.lastAt).toLocaleDateString('en-PK', { timeZone: 'Asia/Karachi' })}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
