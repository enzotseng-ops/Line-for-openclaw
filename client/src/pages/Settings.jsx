import React, { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const LLM_PROVIDERS = [
  { value: 'claude', label: 'Claude (Anthropic)' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'custom', label: 'Custom (OpenAI compatible)' },
];

const DEFAULT_MODELS = {
  claude: 'claude-sonnet-4-20250514',
  openai: 'gpt-4o',
  custom: 'your-model-name',
};

export default function Settings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [showApiKey, setShowApiKey] = useState(false);
  const [showRagKey, setShowRagKey] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    api.get('/settings').then((res) => {
      const map = {};
      res.data.forEach((s) => { map[s.key] = s.value; });
      setSettings(map);
    }).catch(() => toast.error('載入失敗'))
      .finally(() => setLoading(false));
  }, []);

  const updateSetting = async (key, value) => {
    setSaving((prev) => ({ ...prev, [key]: true }));
    try {
      await api.patch(`/settings/${key}`, { value });
      setSettings((prev) => ({ ...prev, [key]: value }));
      toast.success('已儲存');
    } catch (err) {
      toast.error('儲存失敗');
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleProviderChange = (provider) => {
    setSettings((prev) => ({ ...prev, llm_provider: provider, llm_model: DEFAULT_MODELS[provider] || '' }));
  };

  const testLLM = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.get('/settings/llm/test');
      setTestResult({ success: true, message: `連線成功！模型: ${res.data.model}` });
    } catch (err) {
      setTestResult({ success: false, message: err.response?.data?.error || '連線失敗' });
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <div className="p-6 text-gray-400">載入中...</div>;

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <h1 className="text-xl font-semibold">系統設定</h1>

      {/* LLM Settings */}
      <Section title="LLM 設定">
        <Field label="LLM 供應商">
          <select
            value={settings.llm_provider || 'claude'}
            onChange={(e) => handleProviderChange(e.target.value)}
            className="input-field"
          >
            {LLM_PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <SaveBtn onClick={() => updateSetting('llm_provider', settings.llm_provider)} saving={saving.llm_provider} />
        </Field>

        <Field label="API Key">
          <div className="flex gap-2 flex-1">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={settings.llm_api_key || ''}
              onChange={(e) => setSettings((prev) => ({ ...prev, llm_api_key: e.target.value }))}
              placeholder="sk-..."
              className="input-field flex-1"
            />
            <button onClick={() => setShowApiKey(!showApiKey)} className="text-xs text-gray-500 px-2 border rounded">
              {showApiKey ? '隱藏' : '顯示'}
            </button>
          </div>
          <SaveBtn onClick={() => updateSetting('llm_api_key', settings.llm_api_key)} saving={saving.llm_api_key} />
        </Field>

        <Field label="模型名稱">
          <input
            type="text"
            value={settings.llm_model || ''}
            onChange={(e) => setSettings((prev) => ({ ...prev, llm_model: e.target.value }))}
            placeholder="claude-sonnet-4-20250514"
            className="input-field flex-1"
          />
          <SaveBtn onClick={() => updateSetting('llm_model', settings.llm_model)} saving={saving.llm_model} />
        </Field>

        {settings.llm_provider === 'custom' && (
          <Field label="Base URL">
            <input
              type="text"
              value={settings.custom_llm_base_url || ''}
              onChange={(e) => setSettings((prev) => ({ ...prev, custom_llm_base_url: e.target.value }))}
              placeholder="https://api.example.com/v1"
              className="input-field flex-1"
            />
            <SaveBtn onClick={() => updateSetting('custom_llm_base_url', settings.custom_llm_base_url)} saving={saving.custom_llm_base_url} />
          </Field>
        )}

        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={testLLM}
            disabled={testing}
            className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {testing ? '測試中...' : '測試連線'}
          </button>
          {testResult && (
            <span className={`text-sm ${testResult.success ? 'text-green-600' : 'text-red-500'}`}>
              {testResult.message}
            </span>
          )}
        </div>
      </Section>

      {/* System Prompt */}
      <Section title="系統提示詞 (System Prompt)">
        <textarea
          rows={6}
          value={settings.system_prompt || ''}
          onChange={(e) => setSettings((prev) => ({ ...prev, system_prompt: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="你是無毒農的智能客服助理..."
        />
        <SaveBtn onClick={() => updateSetting('system_prompt', settings.system_prompt)} saving={saving.system_prompt} fullWidth />
      </Section>

      {/* Google File Search (RAG) */}
      <Section title="知識庫 (RAG) 設定">
        <p className="text-xs text-gray-500 mb-3">使用 OpenAI Assistants API File Search 作為 RAG 知識庫，需要 OpenAI API Key 與 Assistant ID。</p>

        <Field label="OpenAI API Key">
          <div className="flex gap-2 flex-1">
            <input
              type={showRagKey ? 'text' : 'password'}
              value={settings.google_file_search_api_key || ''}
              onChange={(e) => setSettings((prev) => ({ ...prev, google_file_search_api_key: e.target.value }))}
              placeholder="sk-..."
              className="input-field flex-1"
            />
            <button onClick={() => setShowRagKey(!showRagKey)} className="text-xs text-gray-500 px-2 border rounded">
              {showRagKey ? '隱藏' : '顯示'}
            </button>
          </div>
          <SaveBtn onClick={() => updateSetting('google_file_search_api_key', settings.google_file_search_api_key)} saving={saving.google_file_search_api_key} />
        </Field>

        <Field label="Assistant ID">
          <input
            type="text"
            value={settings.google_assistant_id || ''}
            onChange={(e) => setSettings((prev) => ({ ...prev, google_assistant_id: e.target.value }))}
            placeholder="asst_..."
            className="input-field flex-1"
          />
          <SaveBtn onClick={() => updateSetting('google_assistant_id', settings.google_assistant_id)} saving={saving.google_assistant_id} />
        </Field>
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <h2 className="font-medium text-gray-800 border-b border-gray-100 pb-2">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      <div className="flex gap-2 items-center">{children}</div>
    </div>
  );
}

function SaveBtn({ onClick, saving, fullWidth }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className={`px-3 py-2 bg-green-500 text-white text-xs rounded-lg hover:bg-green-600 disabled:opacity-50 ${fullWidth ? 'w-full mt-2' : 'flex-shrink-0'}`}
    >
      {saving ? '儲存中...' : '儲存'}
    </button>
  );
}
