import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({});
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [noteModal, setNoteModal] = useState(null);
  const navigate = useNavigate();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/line-users', { params: { page, limit: 20, search } });
      setUsers(res.data.users);
      setPagination(res.data.pagination);
    } catch (err) {
      toast.error('載入失敗', { id: 'users-fetch-error' });
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const toggleMode = async (user) => {
    const newMode = user.mode === 'ai' ? 'manual' : 'ai';
    try {
      await api.patch(`/line-users/${user.id}/mode`, { mode: newMode });
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, mode: newMode } : u));
      toast.success(`已切換為${newMode === 'ai' ? 'AI' : '人工'}模式`);
    } catch (err) {
      toast.error('切換失敗');
    }
  };

  const saveNote = async (userId, note) => {
    try {
      await api.patch(`/line-users/${userId}/note`, { note });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, note } : u));
      setNoteModal(null);
      toast.success('備註已儲存');
    } catch (err) {
      toast.error('儲存失敗');
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">用戶管理</h1>
        <span className="text-sm text-gray-500">共 {pagination.total || 0} 位用戶</span>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="搜尋名稱或 LINE User ID..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 max-w-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">用戶</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">LINE User ID</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">模式</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">最後訊息</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">備註</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">載入中...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">無資料</td></tr>
            ) : users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {user.picture_url ? (
                      <img src={user.picture_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs">
                        {user.display_name?.[0] || '?'}
                      </div>
                    )}
                    <span className="font-medium">{user.display_name || '未知'}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{user.line_user_id}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleMode(user)}
                    className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${
                      user.mode === 'ai' ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      user.mode === 'ai' ? 'translate-x-5' : 'translate-x-1'
                    }`} />
                  </button>
                  <span className="ml-2 text-xs text-gray-500">{user.mode === 'ai' ? 'AI' : '人工'}</span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {user.last_message_at ? dayjs(user.last_message_at).format('MM/DD HH:mm') : '-'}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 max-w-[150px] truncate">{user.note || '-'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/messages?line_user_id=${user.line_user_id}`)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      對話
                    </button>
                    <button
                      onClick={() => setNoteModal({ id: user.id, note: user.note || '' })}
                      className="text-xs text-gray-600 hover:underline"
                    >
                      備註
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination.total > 20 && (
        <div className="flex gap-2 justify-center">
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            className="px-3 py-1 border rounded text-sm disabled:opacity-40"
          >
            上一頁
          </button>
          <span className="px-3 py-1 text-sm text-gray-600">
            {page} / {Math.ceil(pagination.total / 20)}
          </span>
          <button
            disabled={page >= Math.ceil(pagination.total / 20)}
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1 border rounded text-sm disabled:opacity-40"
          >
            下一頁
          </button>
        </div>
      )}

      {/* Note modal */}
      {noteModal && (
        <NoteModal
          note={noteModal.note}
          onSave={(note) => saveNote(noteModal.id, note)}
          onClose={() => setNoteModal(null)}
        />
      )}
    </div>
  );
}

function NoteModal({ note, onSave, onClose }) {
  const [value, setValue] = useState(note);
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
        <h2 className="font-semibold mb-3">編輯備註</h2>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={4}
          className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <div className="flex justify-end gap-2 mt-3">
          <button onClick={onClose} className="px-4 py-2 text-sm border rounded-lg">取消</button>
          <button onClick={() => onSave(value)} className="px-4 py-2 text-sm bg-green-500 text-white rounded-lg">儲存</button>
        </div>
      </div>
    </div>
  );
}
