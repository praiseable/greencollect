import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getChatMessages, sendChatMessage, getChatConversations } from '../services/api';

export default function Chat() {
  const { userId } = useParams();
  const [messages, setMessages] = useState([]);
  const [partner, setPartner] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    getChatMessages(userId)
      .then((res) => {
        setMessages(Array.isArray(res.data) ? res.data : res.data?.data ?? []);
      })
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
    getChatConversations()
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
        const conv = list.find((c) => c.userId === userId);
        setPartner(conv?.user || { id: userId });
      })
      .catch(() => setPartner({ id: userId }));
  }, [userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput('');
    try {
      const res = await sendChatMessage(userId, { message: text });
      setMessages((prev) => [...prev, res.data]);
    } catch {
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const myId = JSON.parse(localStorage.getItem('admin_user') || '{}')?.id;
  const partnerName = partner ? [partner.firstName, partner.lastName].filter(Boolean).join(' ') || partner.displayName || 'User' : 'Chat';

  if (!userId) {
    return <div className="card py-12 text-center text-gray-500">Select a conversation from Chat Inbox.</div>;
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-4 py-3">
        <h2 className="font-semibold text-gray-900">{partnerName}</h2>
        <p className="text-xs text-gray-500">User ID: {userId}</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.fromUserId === myId;
            return (
              <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    isMe ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm">{m.message}</p>
                  <p className={`mt-1 text-[10px] ${isMe ? 'text-green-100' : 'text-gray-500'}`}>
                    {new Date(m.createdAt).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      <div className="border-t border-gray-100 p-3">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex gap-2"
        >
          <input
            type="text"
            className="input flex-1"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" className="btn-primary" disabled={sending || !input.trim()}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
