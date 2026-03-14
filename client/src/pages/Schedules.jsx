import React, { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const DAY_NAMES = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

export default function Schedules() {
  const [rules, setRules] = useState([]);
  const [globalAI, setGlobalAI] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ day_of_week: 1, start_time: '09:00', end_time: '18:00', is_enabled: true });

  useEffect(() => {
    Promise.all([
      api.get('/schedules'),
      api.get('/settings'),
    ]).then(([rulesRes, settingsRes]) => {
      setRules(rulesRes.data);
      const globalSetting = settingsRes.data.find((s) => s.key === 'global_ai_enabled');
      setGlobalAI(globalSetting?.value === 'true');
    }).catch(() => toast.error('載入失敗'))
      .finally(() => setLoading(false));
  }, []);

  const toggleGlobal = async () => {
    const newVal = !globalAI;
    try {
      await api.patch('/settings/global_ai_enabled', { value: String(newVal) });
      setGlobalAI(newVal);
      toast.success(newVal ? 'AI 已啟用' : 'AI 已停用');
    } catch (err) {
      toast.error('更新失敗');
    }
  };

  const addRule = async () => {
    try {
      const res = await api.post('/schedules', form);
      setRules((prev) => [...prev, res.data].sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time)));
      setShowForm(false);
      toast.success('已新增排程');
    } catch (err) {
      toast.error('新增失敗');
    }
  };

  const toggleRule = async (rule) => {
    try {
      const res = await api.patch(`/schedules/${rule.id}`, { is_enabled: !rule.is_enabled });
      setRules((prev) => prev.map((r) => r.id === rule.id ? res.data : r));
    } catch (err) {
      toast.error('更新失敗');
    }
  };

  const deleteRule = async (id) => {
    if (!confirm('確定刪除此排程？')) return;
    try {
      await api.delete(`/schedules/${id}`);
      setRules((prev) => prev.filter((r) => r.id !== id));
      toast.success('已刪除');
    } catch (err) {
      toast.error('刪除失敗');
    }
  };

  const applyTemplate = () => {
    const templates = [1, 2, 3, 4, 5].map((day) => ({
      day_of_week: day, start_time: '09:00', end_time: '18:00', is_enabled: true,
    }));
    Promise.all(templates.map((t) => api.post('/schedules', t))).then((results) => {
      setRules((prev) => [...prev, ...results.map((r) => r.data)]);
      toast.success('已套用週一至週五 09:00-18:00 樣板');
    }).catch(() => toast.error('部分新增失敗'));
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">排程設定</h1>

      {/* Global switch */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">全域 AI 總開關</p>
            <p className="text-sm text-gray-500 mt-0.5">
              {globalAI ? '目前 AI 自動回覆已啟用' : '目前 AI 自動回覆已停用（所有訊息由人工處理）'}
            </p>
          </div>
          <button
            onClick={toggleGlobal}
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
              globalAI ? 'bg-green-500' : 'bg-gray-300'
            }`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              globalAI ? 'translate-x-8' : 'translate-x-1'
            }`} />
          </button>
        </div>
      </div>

      {/* Schedule rules */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">時段規則</h2>
          <div className="flex gap-2">
            <button
              onClick={applyTemplate}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              套用週一~五 9-18 時
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="px-3 py-1.5 text-xs bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              + 新增規則
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">載入中...</p>
        ) : rules.length === 0 ? (
          <p className="text-gray-400 text-sm">尚無排程規則，AI 將在任何時間回覆（若全域開關已開）</p>
        ) : (
          <div className="space-y-2">
            {rules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleRule(rule)}
                    className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${
                      rule.is_enabled ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      rule.is_enabled ? 'translate-x-5' : 'translate-x-1'
                    }`} />
                  </button>
                  <span className="text-sm font-medium w-10">{DAY_NAMES[rule.day_of_week]}</span>
                  <span className="text-sm text-gray-600">
                    {rule.start_time?.substring(0, 5)} ~ {rule.end_time?.substring(0, 5)}
                  </span>
                </div>
                <button onClick={() => deleteRule(rule.id)} className="text-xs text-red-500 hover:underline">刪除</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add rule form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm space-y-4">
            <h2 className="font-semibold">新增排程規則</h2>
            <div>
              <label className="text-sm text-gray-600">星期</label>
              <select
                value={form.day_of_week}
                onChange={(e) => setForm({ ...form, day_of_week: parseInt(e.target.value) })}
                className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
              >
                {DAY_NAMES.map((name, i) => <option key={i} value={i}>{name}</option>)}
              </select>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-sm text-gray-600">開始時間</label>
                <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                  className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
              </div>
              <div className="flex-1">
                <label className="text-sm text-gray-600">結束時間</label>
                <input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                  className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border rounded-lg">取消</button>
              <button onClick={addRule} className="px-4 py-2 text-sm bg-green-500 text-white rounded-lg">新增</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
