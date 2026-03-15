import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function ChangePassword() {
  const { clearPasswordChangeFlag } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = form;
    if (!currentPassword || !newPassword) {
      return toast.error('請輸入目前密碼和新密碼');
    }
    if (newPassword.length < 8) {
      return toast.error('新密碼至少需要 8 個字元');
    }
    if (newPassword !== confirmPassword) {
      return toast.error('新密碼與確認密碼不一致');
    }
    setSaving(true);
    try {
      await api.put('/auth/password', { currentPassword, newPassword });
      toast.success('密碼已更新，歡迎使用系統！');
      clearPasswordChangeFlag();
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || '密碼更新失敗');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold">請修改預設密碼</h1>
          <p className="text-gray-500 text-sm mt-1">為了系統安全，首次登入後必須修改預設密碼才能繼續使用</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">目前密碼</label>
            <input
              type="password"
              value={form.currentPassword}
              onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="輸入目前密碼"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">新密碼</label>
            <input
              type="password"
              value={form.newPassword}
              onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="至少 8 個字元"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">確認新密碼</label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="再次輸入新密碼"
              required
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saving ? '更新中...' : '更新密碼並進入系統'}
          </button>
        </form>

        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
          <p>密碼要求：至少 8 個字元。修改後預設密碼將永久失效。</p>
        </div>
      </div>
    </div>
  );
}
