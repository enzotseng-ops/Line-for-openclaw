import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

export default function Messages() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(searchParams.get('line_user_id') || '');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const messagesEndRef = useRef(null);

  useEffect(() => {
    api.get('/line-users', { params: { limit: 100 } }).then((res) => setUsers(res.data.users));
  }, []);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 50 };
      if (selectedUser) params.line_user_id = selectedUser;
      if (dateRange.start) params.start_date = dateRange.start;
      if (dateRange.end) params.end_date = dateRange.end;

      const res = await api.get('/messages', { params });
      setMessages(res.data.messages.reverse());
      setPagination(res.data.pagination);
    } catch (err) {
      toast.error('載入失敗');
    } finally {
      setLoading(false);
    }
  }, [selectedUser, dateRange, page]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  const exportCSV = async () => {
    try {
      const params = {};
      if (selectedUser) params.line_user_id = selectedUser;
      if (dateRange.start) params.start_date = dateRange.start;
      if (dateRange.end) params.end_date = dateRange.end;

      const res = await api.get('/messages/export', { params, responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `messages_${dayjs().format('YYYYMMDD')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('匯出失敗');
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">訊息紀錄</h1>
        <button
          onClick={exportCSV}
          className="px-4 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600"
        >
          匯出 CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3">
        <select
          value={selectedUser}
          onChange={(e) => { setSelectedUser(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">所有用戶</option>
          {users.map((u) => (
            <option key={u.line_user_id} value={u.line_user_id}>
              {u.display_name || u.line_user_id}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={dateRange.start}
          onChange={(e) => { setDateRange((d) => ({ ...d, start: e.target.value })); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
        />
        <input
          type="date"
          value={dateRange.end}
          onChange={(e) => { setDateRange((d) => ({ ...d, end: e.target.value })); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
        />
        <button
          onClick={() => { setDateRange({ start: '', end: '' }); setSelectedUser(''); setPage(1); }}
          className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          清除
        </button>
      </div>

      {/* Chat view */}
      <div className="bg-white rounded-xl border border-gray-200 min-h-[400px] max-h-[600px] overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="text-center text-gray-400 py-8">載入中...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-400 py-8">無訊息紀錄</div>
        ) : messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="text-xs text-gray-400 text-right">
        共 {pagination.total || 0} 則訊息
      </div>
    </div>
  );
}

function MessageBubble({ msg }) {
  const isInbound = msg.direction === 'inbound';

  return (
    <div className={`flex ${isInbound ? 'justify-start' : 'justify-end'} gap-2`}>
      {isInbound && (
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs flex-shrink-0 mt-1">
          {msg.display_name?.[0] || '?'}
        </div>
      )}
      <div className={`max-w-[70%]`}>
        {isInbound && (
          <p className="text-xs text-gray-500 mb-1">{msg.display_name || msg.line_user_id}</p>
        )}
        <div className={`rounded-2xl px-3 py-2 text-sm ${
          isInbound ? 'bg-gray-100 text-gray-800 rounded-tl-sm' : 'bg-green-500 text-white rounded-tr-sm'
        }`}>
          {msg.message_type === 'text' ? (
            <p className="whitespace-pre-wrap">{msg.content}</p>
          ) : (
            <p className="text-xs opacity-70">[{msg.message_type}]{msg.media_url ? ' 已儲存' : ''}</p>
          )}
        </div>
        <div className={`flex gap-2 mt-1 text-xs text-gray-400 ${isInbound ? '' : 'justify-end'}`}>
          <span>{dayjs(msg.created_at).format('MM/DD HH:mm')}</span>
          {msg.reply_source && <span className="text-green-600">{msg.reply_source === 'ai' ? 'AI' : '人工'}</span>}
        </div>
      </div>
    </div>
  );
}
