import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import useAuthStore from '../store/authStore';

export default function Chat() {
  const user = useAuthStore(s => s.user);
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const msgEndRef = useRef(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/chat/conversations');
      setConversations(data || []);
    } catch {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const selectChat = async (conv) => {
    setActiveChat(conv);
    try {
      const { data } = await api.get(`/chat/${conv.userId || conv.id}`);
      setMessages(data.messages || data || []);
    } catch {
      setMessages([]);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;
    try {
      const { data } = await api.post(`/chat/${activeChat.userId || activeChat.id}`, { message: newMessage });
      setMessages(prev => [...prev, data]);
      setNewMessage('');
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Messages</h1>
      <div className="card overflow-hidden flex" style={{ height: '70vh' }}>
        {/* Sidebar */}
        <div className="w-80 border-r border-gray-100 flex flex-col">
          <div className="p-4 border-b border-gray-100">
            <input type="text" placeholder="Search conversations..." className="input-field w-full text-sm" />
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-400 text-sm">Loading...</div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-sm">No conversations yet</div>
            ) : (
              conversations.map(conv => (
                <button key={conv.id} onClick={() => selectChat(conv)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                    activeChat?.id === conv.id ? 'bg-primary-50' : ''
                  }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-semibold text-sm">
                      {(conv.otherUser?.firstName || conv.name || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">{conv.otherUser?.firstName || conv.name || 'User'} {conv.otherUser?.lastName || ''}</p>
                      <p className="text-xs text-gray-400 truncate">{conv.lastMessage || 'Start a conversation'}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          {activeChat ? (
            <>
              <div className="p-4 border-b border-gray-100 bg-white flex items-center gap-3">
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-semibold text-sm">
                  {(activeChat.otherUser?.firstName || activeChat.name || '?')[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-sm">{activeChat.otherUser?.firstName || activeChat.name || 'User'}</p>
                  <p className="text-xs text-green-500">Online</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {messages.map((msg, i) => {
                  const isMine = msg.senderId === user?.id;
                  return (
                    <div key={i} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] px-4 py-2 rounded-2xl text-sm ${
                        isMine ? 'bg-primary-600 text-white rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none border'
                      }`}>
                        {msg.message || msg.content}
                        <div className={`text-[10px] mt-1 ${isMine ? 'text-primary-200' : 'text-gray-400'}`}>
                          {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={msgEndRef} />
              </div>
              <form onSubmit={sendMessage} className="p-4 border-t border-gray-100 bg-white flex gap-2">
                <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)}
                  placeholder="Type a message..." className="input-field flex-1 text-sm" />
                <button type="submit" className="btn-primary px-4 py-2 rounded-lg text-sm">Send</button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-300">
              <div className="text-center">
                <p className="text-5xl mb-4">💬</p>
                <p className="text-lg font-medium">Select a conversation</p>
                <p className="text-sm mt-1">Choose from the sidebar or start a new chat from a listing</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
