import React, { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const LLM_PROVIDERS = [
  { value: 'claude', label: 'Claude (Anthropic)' },
  { value: 'openai', label: 'OpenAI (GPT)' },
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'minimax', label: 'MiniMax' },
  { value: 'custom', label: 'Custom (OpenAI compatible)' },
];

const PROVIDER_MODELS = {
  claude: [
    { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5' },
    { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
    { value: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
  ],
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o mini' },
    { value: 'gpt-4.1', label: 'GPT-4.1' },
    { value: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
    { value: 'gpt-5', label: 'GPT-5' },
    { value: 'gpt-5-mini', label: 'GPT-5 mini' },
    { value: 'gpt-5-nano', label: 'GPT-5 nano' },
    { value: 'gpt-5.1', label: 'GPT-5.1' },
    { value: 'gpt-5.2', label: 'GPT-5.2' },
  ],
  gemini: [
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' },
    { value: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash Image' },
    { value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro Preview' },
    { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview' },
    { value: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro Preview' },
    { value: 'gemini-3.1-flash-lite-preview', label: 'Gemini 3.1 Flash Lite Preview' },
  ],
  minimax: [
    { value: 'minimax-m2.5', label: 'MiniMax M2.5' },
  ],
};

const DEFAULT_MODELS = {
  claude: 'claude-sonnet-4-5',
  openai: 'gpt-4o',
  gemini: 'gemini-2.5-flash',
  minimax: 'minimax-m2.5',
  custom: '',
};

export default function Settings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [showApiKey, setShowApiKey] = useState(false);
  const [showRagKey, setShowRagKey] = useState(false);
  const [showLineSecret, setShowLineSecret] = useState(false);
  const [showLineToken, setShowLineToken] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [lineTestResult, setLineTestResult] = useState(null);
  const [lineTesting, setLineTesting] = useState(false);
  const [showLineTutorial, setShowLineTutorial] = useState(false);

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

  const testLine = useCallback(async () => {
    setLineTesting(true);
    setLineTestResult(null);
    try {
      const res = await api.get('/settings/line/test');
      setLineTestResult({ success: true, bot: res.data.bot });
    } catch (err) {
      setLineTestResult({ success: false, message: err.response?.data?.error || '連線失敗' });
    } finally {
      setLineTesting(false);
    }
  }, []);

  const productionWebhookUrl = 'https://line-bot.openclaw-gb.com/api/webhook/line';
  const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const webhookUrl = isLocalDev ? productionWebhookUrl : `${window.location.origin}/api/webhook/line`;

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
            list={`models-${settings.llm_provider || 'claude'}`}
            type="text"
            value={settings.llm_model || ''}
            onChange={(e) => setSettings((prev) => ({ ...prev, llm_model: e.target.value }))}
            placeholder={DEFAULT_MODELS[settings.llm_provider] || 'model-name'}
            className="input-field flex-1"
          />
          <datalist id={`models-${settings.llm_provider || 'claude'}`}>
            {(PROVIDER_MODELS[settings.llm_provider] || []).map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </datalist>
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
        <p className="text-xs text-gray-500 mb-3">
          使用 <strong>Google Gemini File Search</strong> 作為 RAG 知識庫。需要 Google AI API Key（可至{' '}
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-blue-500 underline">AI Studio</a>{' '}
          取得）以及 File Search Store Name（格式：<code>fileSearchStores/your-store-name</code>）。
        </p>

        <Field label="Google AI API Key">
          <div className="flex gap-2 flex-1">
            <input
              type={showRagKey ? 'text' : 'password'}
              value={settings.google_file_search_api_key || ''}
              onChange={(e) => setSettings((prev) => ({ ...prev, google_file_search_api_key: e.target.value }))}
              placeholder="AIza..."
              className="input-field flex-1"
            />
            <button onClick={() => setShowRagKey(!showRagKey)} className="text-xs text-gray-500 px-2 border rounded">
              {showRagKey ? '隱藏' : '顯示'}
            </button>
          </div>
          <SaveBtn onClick={() => updateSetting('google_file_search_api_key', settings.google_file_search_api_key)} saving={saving.google_file_search_api_key} />
        </Field>

        <Field label="File Search Store Name">
          <input
            type="text"
            value={settings.google_assistant_id || ''}
            onChange={(e) => setSettings((prev) => ({ ...prev, google_assistant_id: e.target.value }))}
            placeholder="fileSearchStores/..."
            className="input-field flex-1"
          />
          <SaveBtn onClick={() => updateSetting('google_assistant_id', settings.google_assistant_id)} saving={saving.google_assistant_id} />
        </Field>
      </Section>

      {/* LINE Channel Settings */}
      <Section title="LINE Messaging API 串接設定">
        {/* Connection Status */}
        <LineConnectionStatus result={lineTestResult} />

        {/* Credential Inputs */}
        <Field label="Channel Secret">
          <div className="flex gap-2 flex-1">
            <input
              type={showLineSecret ? 'text' : 'password'}
              value={settings.line_channel_secret || ''}
              onChange={(e) => setSettings((prev) => ({ ...prev, line_channel_secret: e.target.value }))}
              placeholder="32 碼 hex 字串（Basic settings 頁籤）"
              className="input-field flex-1"
            />
            <button onClick={() => setShowLineSecret(!showLineSecret)} className="text-xs text-gray-500 px-2 border rounded">
              {showLineSecret ? '隱藏' : '顯示'}
            </button>
          </div>
          <SaveBtn onClick={() => updateSetting('line_channel_secret', settings.line_channel_secret)} saving={saving.line_channel_secret} />
        </Field>

        <Field label="Channel Access Token">
          <div className="flex gap-2 flex-1">
            <input
              type={showLineToken ? 'text' : 'password'}
              value={settings.line_channel_access_token || ''}
              onChange={(e) => setSettings((prev) => ({ ...prev, line_channel_access_token: e.target.value }))}
              placeholder="長字串 token（Messaging API 頁籤 → Issue）"
              className="input-field flex-1"
            />
            <button onClick={() => setShowLineToken(!showLineToken)} className="text-xs text-gray-500 px-2 border rounded">
              {showLineToken ? '隱藏' : '顯示'}
            </button>
          </div>
          <SaveBtn onClick={() => updateSetting('line_channel_access_token', settings.line_channel_access_token)} saving={saving.line_channel_access_token} />
        </Field>

        {/* Test Connection */}
        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={testLine}
            disabled={lineTesting}
            className="px-4 py-2 bg-[#06C755] text-white text-sm rounded-lg hover:bg-[#05b34d] disabled:opacity-50"
          >
            {lineTesting ? '測試中...' : '測試 LINE 連線'}
          </button>
          {lineTestResult && !lineTestResult.success && (
            <span className="text-sm text-red-500">{lineTestResult.message}</span>
          )}
        </div>

        {/* Bot Info Card */}
        {lineTestResult?.success && lineTestResult.bot && (
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg p-3 mt-1">
            {lineTestResult.bot.pictureUrl && (
              <img src={lineTestResult.bot.pictureUrl} alt="Bot" className="w-10 h-10 rounded-full" />
            )}
            <div className="text-sm">
              <p className="font-medium text-green-800">{lineTestResult.bot.displayName}</p>
              <p className="text-green-600 text-xs">Bot ID: {lineTestResult.bot.userId}</p>
            </div>
            <span className="ml-auto text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full">已連線</span>
          </div>
        )}

        {/* Webhook URL */}
        <div className="mt-2">
          <label className="block text-sm text-gray-600 mb-1">Webhook URL</label>
          <div className="flex gap-2 items-center">
            <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 select-all break-all">
              {webhookUrl}
            </code>
            <button
              onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success('已複製'); }}
              className="px-3 py-2 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 flex-shrink-0"
            >
              複製
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            已透過 Cloudflare Tunnel 對外，直接將此 URL 貼到 LINE Console
          </p>
        </div>

        {/* Tutorial Toggle */}
        <button
          onClick={() => setShowLineTutorial((prev) => !prev)}
          className="w-full text-left text-sm text-blue-600 hover:text-blue-800 font-medium mt-2 flex items-center gap-1"
        >
          <span className={`inline-block transition-transform ${showLineTutorial ? 'rotate-90' : ''}`}>&#9654;</span>
          {showLineTutorial ? '收起完整教學' : '展開完整教學：LINE Messaging API + Webhook 設定'}
        </button>

        {showLineTutorial && <LineTutorial webhookUrl={webhookUrl} />}
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

function LineConnectionStatus({ result }) {
  if (!result) {
    return (
      <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
        <span className="text-sm text-yellow-700">尚未測試連線 — 請填入憑證後點擊「測試 LINE 連線」</span>
      </div>
    );
  }
  if (result.success) {
    return null; // Bot info card is shown separately
  }
  return (
    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
      <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
      <span className="text-sm text-red-700">連線失敗：{result.message}</span>
    </div>
  );
}

function TutorialStep({ step, title, children }) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#06C755] text-white text-sm font-bold flex items-center justify-center mt-0.5">
        {step}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-gray-800 text-sm mb-1">{title}</h4>
        <div className="text-xs text-gray-600 space-y-2">{children}</div>
      </div>
    </div>
  );
}

function LineTutorial({ webhookUrl }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-5 mt-2">
      <div className="text-center mb-2">
        <h3 className="font-semibold text-gray-800">LINE Messaging API 完整設定教學</h3>
        <p className="text-xs text-gray-500 mt-1">從零開始建立 LINE Bot 並連接到本系統</p>
      </div>

      {/* Phase 1 */}
      <div className="space-y-4">
        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-300 pb-1">
          Phase 1 — 建立 LINE Channel
        </div>

        <TutorialStep step={1} title="登入 LINE Developers Console">
          <p>
            前往{' '}
            <a href="https://developers.line.biz/console/" target="_blank" rel="noreferrer" className="text-blue-500 underline font-medium">
              https://developers.line.biz/console/
            </a>{' '}
            使用你的 LINE 帳號登入。
          </p>
          <p className="text-gray-400">若第一次使用，會需要同意開發者條款並建立帳號。</p>
        </TutorialStep>

        <TutorialStep step={2} title="建立 Provider（提供者）">
          <p>Provider 是管理多個 Channel 的容器，通常用公司或專案名稱。</p>
          <div className="bg-white border rounded p-2 space-y-1">
            <p>1. 點擊首頁的 <strong>「Create」</strong> 按鈕</p>
            <p>2. 選擇 <strong>「Create a new provider」</strong></p>
            <p>3. 輸入名稱（例如：<code className="bg-gray-100 px-1 rounded">無毒農</code>）→ Create</p>
          </div>
          <p className="text-gray-400">若已有 Provider，直接點進去即可。</p>
        </TutorialStep>

        <TutorialStep step={3} title="建立 Messaging API Channel">
          <p>在 Provider 頁面中建立新的 Channel：</p>
          <div className="bg-white border rounded p-2 space-y-1">
            <p>1. 點擊 <strong>「Create a Messaging API channel」</strong></p>
            <p>2. 填寫必要欄位：</p>
            <table className="w-full text-xs mt-1">
              <tbody>
                <tr className="border-b"><td className="py-1 pr-2 font-medium w-32">Channel type</td><td>Messaging API</td></tr>
                <tr className="border-b"><td className="py-1 pr-2 font-medium">Provider</td><td>選擇剛建立的 Provider</td></tr>
                <tr className="border-b"><td className="py-1 pr-2 font-medium">Channel name</td><td>你的 Bot 顯示名稱（例如：無毒農智能客服）</td></tr>
                <tr className="border-b"><td className="py-1 pr-2 font-medium">Channel description</td><td>簡短描述</td></tr>
                <tr className="border-b"><td className="py-1 pr-2 font-medium">Category</td><td>選擇最接近的行業分類</td></tr>
                <tr><td className="py-1 pr-2 font-medium">Subcategory</td><td>選擇子分類</td></tr>
              </tbody>
            </table>
            <p className="mt-1">3. 勾選同意條款 → <strong>Create</strong></p>
          </div>
        </TutorialStep>
      </div>

      {/* Phase 2 */}
      <div className="space-y-4">
        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-300 pb-1">
          Phase 2 — 取得憑證
        </div>

        <TutorialStep step={4} title="取得 Channel Secret">
          <div className="bg-white border rounded p-2 space-y-1">
            <p>1. 進入剛建立的 Channel</p>
            <p>2. 點擊 <strong>「Basic settings」</strong> 頁籤</p>
            <p>3. 找到 <strong>「Channel secret」</strong> 欄位</p>
            <p>4. 點擊旁邊的複製按鈕，貼到上方 <strong>「Channel Secret」</strong> 欄位</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded p-2 mt-1">
            <strong>Channel Secret</strong> 是 32 碼的 hex 字串，格式如：<code className="bg-white px-1 rounded">a1b2c3d4e5f6...</code>
          </div>
        </TutorialStep>

        <TutorialStep step={5} title="產生 Channel Access Token">
          <div className="bg-white border rounded p-2 space-y-1">
            <p>1. 切換到 <strong>「Messaging API」</strong> 頁籤</p>
            <p>2. 滑到最下方找到 <strong>「Channel access token (long-lived)」</strong></p>
            <p>3. 點擊 <strong>「Issue」</strong> 按鈕產生 Token</p>
            <p>4. 複製產生的 Token，貼到上方 <strong>「Channel Access Token」</strong> 欄位</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded p-2 mt-1">
            <strong>Access Token</strong> 是一串很長的字串（約 170+ 字元），以 <code className="bg-white px-1 rounded">=</code> 結尾。每次 Issue 會產生新 Token，舊的會失效。
          </div>
        </TutorialStep>

        <TutorialStep step={6} title="儲存並測試連線">
          <div className="bg-white border rounded p-2 space-y-1">
            <p>1. 確認兩個欄位都已填入 → 分別點擊 <strong>「儲存」</strong></p>
            <p>2. 點擊上方的 <strong className="text-[#06C755]">「測試 LINE 連線」</strong> 按鈕</p>
            <p>3. 若成功，會顯示你的 Bot 名稱和頭像</p>
          </div>
        </TutorialStep>
      </div>

      {/* Phase 3 */}
      <div className="space-y-4">
        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-300 pb-1">
          Phase 3 — 設定 Webhook（接收訊息）
        </div>

        <TutorialStep step={7} title="啟動 Cloudflare Tunnel">
          <p>LINE 需要一個 <strong>公開的 HTTPS 網址</strong> 才能傳送 Webhook 事件。本專案使用 Cloudflare Tunnel 建立固定網址：</p>
          <div className="bg-gray-800 text-green-400 rounded p-2 font-mono text-xs space-y-1">
            <p># 啟動 Cloudflare Tunnel（指向本機 port 3000）</p>
            <p>cloudflared tunnel run line-bot</p>
          </div>
          <p className="mt-1">啟動後，本機 port 3000 會透過固定網址對外：</p>
          <code className="block bg-white border rounded px-2 py-1 text-blue-700 break-all">
            https://line-bot.openclaw-gb.com
          </code>
          <div className="bg-green-50 border border-green-200 rounded p-2 mt-1">
            Cloudflare Tunnel 使用<strong>固定子網域</strong>，不需要每次重新設定 LINE Webhook URL。
          </div>
        </TutorialStep>

        <TutorialStep step={8} title="在 LINE Console 設定 Webhook URL">
          <div className="bg-white border rounded p-2 space-y-1">
            <p>1. 回到 LINE Developers Console → 你的 Channel</p>
            <p>2. 點擊 <strong>「Messaging API」</strong> 頁籤</p>
            <p>3. 找到 <strong>「Webhook settings」</strong> 區塊</p>
            <p>4. 點擊 <strong>「Edit」</strong>，填入 Webhook URL：</p>
          </div>
          <div className="mt-1">
            <p className="text-xs text-gray-500 mb-1">正式環境：</p>
            <code className="block bg-white border rounded px-2 py-1 text-blue-700 break-all">
              {webhookUrl}
            </code>
            <p className="text-xs text-gray-500 mt-2 mb-1">Cloudflare Tunnel（已設定）：</p>
            <code className="block bg-white border rounded px-2 py-1 text-blue-700 break-all">
              https://line-bot.openclaw-gb.com/api/webhook/line
            </code>
          </div>
          <div className="bg-white border rounded p-2 space-y-1 mt-2">
            <p>5. 點擊 <strong>「Update」</strong> 儲存</p>
            <p>6. 點擊 <strong>「Verify」</strong> 按鈕測試 — 應顯示 <strong className="text-green-600">Success</strong></p>
          </div>
        </TutorialStep>

        <TutorialStep step={9} title="啟用 Webhook + 關閉自動回覆">
          <div className="bg-white border rounded p-2 space-y-1">
            <p>1. 在 Webhook settings 區塊，確認 <strong>「Use webhook」</strong> 開關為 <strong className="text-green-600">ON</strong></p>
            <p>2. 找到 <strong>「LINE Official Account features」</strong> 區塊</p>
            <p>3. 點擊 <strong>「Auto-reply messages」</strong> 旁的 <strong>「Edit」</strong></p>
            <p>4. 會跳轉到 LINE Official Account Manager</p>
            <p>5. 將 <strong>「自動回應訊息」</strong> 設為 <strong className="text-red-600">停用</strong></p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded p-2 mt-1">
            <strong>重要：</strong>若不關閉 LINE 內建的自動回覆，使用者會同時收到 LINE 預設回覆 + 本系統的 AI 回覆，造成重複。
          </div>
        </TutorialStep>
      </div>

      {/* Phase 4 */}
      <div className="space-y-4">
        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-300 pb-1">
          Phase 4 — 測試收發訊息
        </div>

        <TutorialStep step={10} title="加入好友並測試">
          <div className="bg-white border rounded p-2 space-y-1">
            <p>1. 在 <strong>「Messaging API」</strong> 頁籤找到 <strong>QR Code</strong></p>
            <p>2. 用手機 LINE 掃描加入好友</p>
            <p>3. 傳送一則訊息（例如：「你好」）</p>
            <p>4. 若一切正常，Bot 會用 AI 自動回覆</p>
            <p>5. 回到本系統的 <strong>「用戶管理」</strong> 和 <strong>「訊息紀錄」</strong> 頁面查看</p>
          </div>
        </TutorialStep>
      </div>

      {/* Troubleshooting */}
      <div className="space-y-3">
        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-300 pb-1">
          疑難排解
        </div>
        <div className="space-y-2 text-xs">
          <TroubleshootItem
            problem="Verify 顯示錯誤"
            solutions={[
              '確認後端已啟動（npm run dev）',
              '確認 Cloudflare Tunnel 正在運行（cloudflared tunnel run line-bot）',
              '確認 Webhook URL 結尾是 /api/webhook/line',
              '確認 Channel Secret 已正確儲存到本系統',
            ]}
          />
          <TroubleshootItem
            problem="Bot 沒有回覆"
            solutions={[
              '確認 Use webhook 已開啟',
              '確認 LINE 內建的自動回覆已關閉',
              '確認用戶模式為 AI（用戶管理頁面）',
              '確認 LLM API Key 設定正確（上方 LLM 設定 → 測試連線）',
              '檢查後端 console 是否有錯誤訊息',
            ]}
          />
          <TroubleshootItem
            problem="收到 401 Invalid signature"
            solutions={[
              'Channel Secret 可能不正確，請重新複製貼上',
              '確認沒有多餘的空白或換行',
            ]}
          />
        </div>
      </div>
    </div>
  );
}

function TroubleshootItem({ problem, solutions }) {
  return (
    <div className="bg-white border rounded p-2">
      <p className="font-medium text-gray-700 mb-1">{problem}</p>
      <ul className="list-disc list-inside text-gray-500 space-y-0.5">
        {solutions.map((s, i) => <li key={i}>{s}</li>)}
      </ul>
    </div>
  );
}
