import React, { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const TRANSPORT_TYPES = [
  { value: 'sse', label: 'SSE (Server-Sent Events)' },
  { value: 'streamable-http', label: 'Streamable HTTP' },
];

const AUTH_TYPES = [
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'x-api-key', label: 'X-Api-Key' },
];

export default function McpServers() {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', transport_type: 'sse', url: '', api_key: '', auth_type: 'bearer' });
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState(null);
  const [refreshingId, setRefreshingId] = useState(null);

  const loadServers = () => {
    api.get('/mcp')
      .then((res) => setServers(res.data))
      .catch(() => toast.error('載入 MCP 伺服器失敗'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadServers(); }, []);

  const resetForm = () => {
    setForm({ name: '', transport_type: 'sse', url: '', api_key: '', auth_type: 'bearer' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (server) => {
    setForm({
      name: server.name,
      transport_type: server.transport_type,
      url: server.url,
      api_key: server.api_key || '',
      auth_type: server.auth_type || 'bearer',
    });
    setEditingId(server.id);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.url) {
      return toast.error('名稱和 URL 為必填');
    }
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/mcp/${editingId}`, form);
        toast.success('已更新');
      } else {
        await api.post('/mcp', form);
        toast.success('已新增');
      }
      resetForm();
      loadServers();
    } catch (err) {
      toast.error(err.response?.data?.error || '儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`確定要刪除「${name}」？`)) return;
    try {
      await api.delete(`/mcp/${id}`);
      toast.success('已刪除');
      loadServers();
    } catch {
      toast.error('刪除失敗');
    }
  };

  const handleToggle = async (server) => {
    try {
      await api.put(`/mcp/${server.id}`, { is_enabled: !server.is_enabled });
      setServers((prev) =>
        prev.map((s) => (s.id === server.id ? { ...s, is_enabled: !s.is_enabled } : s))
      );
      toast.success(server.is_enabled ? '已停用' : '已啟用');
    } catch {
      toast.error('切換失敗');
    }
  };

  const handleTest = async (id) => {
    setTestingId(id);
    try {
      const res = await api.post(`/mcp/${id}/test`);
      toast.success(`連線成功！發現 ${res.data.toolCount} 個工具`);
      loadServers();
    } catch (err) {
      toast.error(err.response?.data?.error || '連線失敗');
    } finally {
      setTestingId(null);
    }
  };

  const handleRefresh = async (id) => {
    setRefreshingId(id);
    try {
      const res = await api.post(`/mcp/${id}/refresh-tools`);
      toast.success(`已刷新！共 ${res.data.tool_count} 個工具`);
      loadServers();
    } catch (err) {
      toast.error(err.response?.data?.error || '刷新失敗');
    } finally {
      setRefreshingId(null);
    }
  };

  if (loading) return <div className="p-6 text-gray-400">載入中...</div>;

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">MCP 伺服器</h1>
          <p className="text-sm text-gray-500 mt-1">
            管理外部 MCP (Model Context Protocol) 工具服務，AI 回覆時可自動調用這些工具
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="px-4 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 flex-shrink-0"
        >
          + 新增伺服器
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-medium text-gray-800 border-b border-gray-100 pb-2">
            {editingId ? '編輯 MCP 伺服器' : '新增 MCP 伺服器'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">名稱</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="例如：天氣查詢、訂單系統"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">傳輸方式</label>
              <select
                value={form.transport_type}
                onChange={(e) => setForm((prev) => ({ ...prev, transport_type: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {TRANSPORT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">URL</label>
              <input
                type="url"
                value={form.url}
                onChange={(e) => setForm((prev) => ({ ...prev, url: e.target.value }))}
                placeholder="https://your-mcp-server.com/sse"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                {form.transport_type === 'sse'
                  ? 'SSE 端點 URL，通常結尾為 /sse 或 /events'
                  : 'Streamable HTTP 端點 URL，通常結尾為 /mcp'}
              </p>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">API Key（選填）</label>
              <input
                type="password"
                value={form.api_key}
                onChange={(e) => setForm((prev) => ({ ...prev, api_key: e.target.value }))}
                placeholder="API 金鑰（選填，加密儲存）"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">認證方式</label>
              <select
                value={form.auth_type}
                onChange={(e) => setForm((prev) => ({ ...prev, auth_type: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {AUTH_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                {form.auth_type === 'bearer'
                  ? '使用 Authorization: Bearer <key> 標頭'
                  : '使用 X-Api-Key: <key> 標頭'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 disabled:opacity-50"
              >
                {saving ? '儲存中...' : editingId ? '更新' : '新增'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Server List */}
      {servers.length === 0 && !showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">尚未設定任何 MCP 伺服器</p>
          <p className="text-gray-400 text-xs mt-1">新增 MCP 伺服器後，AI 回覆時可自動調用外部工具</p>
        </div>
      )}

      {servers.map((server) => (
        <ServerCard
          key={server.id}
          server={server}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggle={handleToggle}
          onTest={handleTest}
          onRefresh={handleRefresh}
          testingId={testingId}
          refreshingId={refreshingId}
        />
      ))}

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <h3 className="font-medium mb-2">什麼是 MCP？</h3>
        <p className="text-xs text-blue-600 mb-2">
          MCP (Model Context Protocol) 是一種開放標準，讓 AI 模型能夠安全地調用外部工具和服務。
          例如查詢天氣、搜尋資料庫、呼叫 API 等。
        </p>
        <h3 className="font-medium mb-1">如何使用</h3>
        <ol className="text-xs text-blue-600 list-decimal list-inside space-y-1">
          <li>部署或使用現有的 MCP 伺服器（需支援 SSE 或 Streamable HTTP 傳輸）</li>
          <li>點擊「新增伺服器」填入名稱和 URL</li>
          <li>點擊「測試連線」確認連線正常並發現可用工具</li>
          <li>啟用後，LINE 用戶傳訊時，AI 會自動判斷是否需要調用這些工具</li>
        </ol>
      </div>
    </div>
  );
}

function ServerCard({ server, onEdit, onDelete, onToggle, onTest, onRefresh, testingId, refreshingId }) {
  const [showTools, setShowTools] = useState(false);
  const isTesting = testingId === server.id;
  const isRefreshing = refreshingId === server.id;

  return (
    <div className={`bg-white rounded-xl border ${server.is_enabled ? 'border-gray-200' : 'border-gray-100 opacity-60'} p-5 space-y-3`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${server.is_enabled ? 'bg-green-400' : 'bg-gray-300'}`} />
          <div>
            <h3 className="font-medium text-gray-800">{server.name}</h3>
            <p className="text-xs text-gray-400 break-all">{server.url}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
            {server.transport_type.toUpperCase()}
          </span>
          {server.auth_type === 'x-api-key' && (
            <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded">
              X-Api-Key
            </span>
          )}
          <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">
            {server.tool_count} 工具
          </span>
        </div>
      </div>

      {/* Tools Preview */}
      {server.tools && server.tools.length > 0 && (
        <div>
          <button
            onClick={() => setShowTools((prev) => !prev)}
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <span className={`inline-block transition-transform ${showTools ? 'rotate-90' : ''}`}>&#9654;</span>
            {showTools ? '收起工具列表' : `查看 ${server.tools.length} 個工具`}
          </button>
          {showTools && (
            <div className="mt-2 space-y-1">
              {server.tools.map((tool) => (
                <div key={tool.name} className="bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-sm font-mono text-gray-700">{tool.name}</p>
                  {tool.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{tool.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Last connected */}
      {server.last_connected_at && (
        <p className="text-xs text-gray-400">
          上次連線：{new Date(server.last_connected_at).toLocaleString('zh-TW')}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
        <button
          onClick={() => onTest(server.id)}
          disabled={isTesting}
          className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          {isTesting ? '測試中...' : '測試連線'}
        </button>
        <button
          onClick={() => onRefresh(server.id)}
          disabled={isRefreshing}
          className="px-3 py-1.5 text-xs border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          {isRefreshing ? '刷新中...' : '刷新工具'}
        </button>
        <button
          onClick={() => onToggle(server)}
          className={`px-3 py-1.5 text-xs rounded-lg ${
            server.is_enabled
              ? 'border border-orange-300 text-orange-600 hover:bg-orange-50'
              : 'border border-green-300 text-green-600 hover:bg-green-50'
          }`}
        >
          {server.is_enabled ? '停用' : '啟用'}
        </button>
        <button
          onClick={() => onEdit(server)}
          className="px-3 py-1.5 text-xs border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50"
        >
          編輯
        </button>
        <button
          onClick={() => onDelete(server.id, server.name)}
          className="px-3 py-1.5 text-xs border border-red-200 text-red-500 rounded-lg hover:bg-red-50 ml-auto"
        >
          刪除
        </button>
      </div>
    </div>
  );
}
