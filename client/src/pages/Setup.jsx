import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import toast from 'react-hot-toast';

const STEPS = [
  { id: 'welcome', label: '歡迎' },
  { id: 'environment', label: '環境檢查' },
  { id: 'admin', label: '管理員帳號' },
  { id: 'line', label: 'LINE 串接' },
  { id: 'llm', label: 'AI 模型' },
  { id: 'complete', label: '完成' },
];

export default function Setup() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [dbUrl, setDbUrl] = useState('');
  const [dbTesting, setDbTesting] = useState(false);
  const [adminForm, setAdminForm] = useState({ email: '', password: '', name: '' });
  const [lineForm, setLineForm] = useState({ channelSecret: '', channelAccessToken: '' });
  const [llmForm, setLlmForm] = useState({ provider: 'gemini', apiKey: '', model: 'gemini-2.5-flash' });
  const [lineTesting, setLineTesting] = useState(false);
  const [lineTestResult, setLineTestResult] = useState(null);
  const [llmTesting, setLlmTesting] = useState(false);
  const [llmTestResult, setLlmTestResult] = useState(null);

  const MODEL_PRESETS = {
    gemini: 'gemini-2.5-flash',
    openai: 'gpt-4o-mini',
    claude: 'claude-sonnet-4-20250514',
    custom: '',
  };

  const checkStatus = useCallback(async () => {
    try {
      const res = await api.get('/setup/status');
      setStatus(res.data);

      // Auto-advance to first incomplete step
      if (res.data.setupComplete) {
        setCurrentStep(5); // complete
      } else if (res.data.setupMode || !res.data.database?.configured) {
        setCurrentStep(1); // environment / database setup
      } else if (!res.data.admin?.configured) {
        setCurrentStep(2); // admin
      } else if (!res.data.line?.configured) {
        setCurrentStep(3); // line
      } else if (!res.data.llm?.configured) {
        setCurrentStep(4); // llm
      }
    } catch {
      // API not reachable
      setStatus({ database: false, admin: false, line: false, llm: false, setupComplete: false });
      setCurrentStep(1);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { checkStatus(); }, [checkStatus]);

  const handleRegister = async () => {
    if (!adminForm.email || !adminForm.password) {
      toast.error('請填入 Email 和密碼');
      return;
    }
    if (adminForm.password.length < 6) {
      toast.error('密碼至少 6 個字元');
      return;
    }
    setSaving(true);
    try {
      await api.post('/auth/register', adminForm);
      await login(adminForm.email, adminForm.password);
      toast.success('管理員帳號建立成功');
      await checkStatus();
      setCurrentStep(3);
    } catch (err) {
      toast.error(err.response?.data?.error || '註冊失敗');
    } finally {
      setSaving(false);
    }
  };

  const handleLoginExisting = async () => {
    if (!adminForm.email || !adminForm.password) {
      toast.error('請填入 Email 和密碼');
      return;
    }
    setSaving(true);
    try {
      await login(adminForm.email, adminForm.password);
      toast.success('登入成功');
      await checkStatus();
      setCurrentStep(3);
    } catch (err) {
      toast.error(err.response?.data?.error || '登入失敗');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLine = async () => {
    if (!lineForm.channelSecret || !lineForm.channelAccessToken) {
      toast.error('請填入 Channel Secret 和 Access Token');
      return;
    }
    setSaving(true);
    try {
      await api.post('/setup/initialize', {
        settings: {
          line_channel_secret: lineForm.channelSecret,
          line_channel_access_token: lineForm.channelAccessToken,
        },
      });
      toast.success('LINE 設定已儲存');
      await checkStatus();
    } catch (err) {
      toast.error(err.response?.data?.error || '儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  const handleTestLine = async () => {
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
  };

  const handleSaveLLM = async () => {
    if (!llmForm.apiKey) {
      toast.error('請填入 API Key');
      return;
    }
    setSaving(true);
    try {
      await api.post('/setup/initialize', {
        settings: {
          llm_provider: llmForm.provider,
          llm_api_key: llmForm.apiKey,
          llm_model: llmForm.model,
        },
      });
      toast.success('LLM 設定已儲存');
      await checkStatus();
    } catch (err) {
      toast.error(err.response?.data?.error || '儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  const handleTestLLM = async () => {
    setLlmTesting(true);
    setLlmTestResult(null);
    try {
      const res = await api.get('/settings/llm/test');
      setLlmTestResult({ success: true, model: res.data.model });
    } catch (err) {
      setLlmTestResult({ success: false, message: err.response?.data?.error || '連線失敗' });
    } finally {
      setLlmTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 w-full max-w-2xl overflow-hidden">
        {/* Progress Bar */}
        <div className="px-8 pt-6">
          <div className="flex items-center justify-between mb-2">
            {STEPS.map((step, i) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    i < currentStep
                      ? 'bg-green-500 text-white'
                      : i === currentStep
                        ? 'bg-green-500 text-white ring-4 ring-green-100'
                        : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {i < currentStep ? '✓' : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-8 sm:w-16 h-0.5 mx-1 ${i < currentStep ? 'bg-green-500' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 text-center mt-1">{STEPS[currentStep]?.label}</p>
        </div>

        {/* Step Content */}
        <div className="p-8">
          {/* Step 0: Welcome */}
          {currentStep === 0 && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-green-500 rounded-2xl flex items-center justify-center mx-auto">
                <span className="text-white text-3xl font-bold">L</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">LINE 智能客服系統</h1>
                <p className="text-gray-500 mt-2">歡迎使用！讓我們一步一步完成初始設定</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 text-left space-y-3">
                <p className="text-sm font-medium text-gray-700">開始前，請確認你已準備好：</p>
                <ChecklistItem label="PostgreSQL 資料庫" hint="下一步透過網頁設定連線字串" />
                <ChecklistItem label="LINE Developers Console 帳號" hint="需要 Messaging API Channel 的 Secret + Token" />
                <ChecklistItem label="AI 模型 API Key" hint="Gemini / OpenAI / Claude 任選一個" />
                <ChecklistItem label="Node.js 18+ 執行環境" hint="後端 + 前端都需要" />
              </div>

              <button
                onClick={() => setCurrentStep(1)}
                className="w-full bg-green-500 hover:bg-green-600 text-white rounded-xl py-3 font-medium transition-colors"
              >
                開始設定
              </button>
            </div>
          )}

          {/* Step 1: Environment / Database Setup */}
          {currentStep === 1 && (() => {
            const dbNeeded = status?.setupMode || !status?.database?.configured;
            return (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-800">
                  {dbNeeded ? '資料庫設定' : '環境檢查'}
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  {dbNeeded ? '輸入 PostgreSQL 連線字串以開始' : '確認基礎環境已就緒'}
                </p>
              </div>

              {dbNeeded ? (
                /* DB not connected: show DATABASE_URL input form */
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">PostgreSQL 連線字串</label>
                    <input
                      type="text"
                      value={dbUrl}
                      onChange={(e) => setDbUrl(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
                      placeholder="postgresql://user:pass@host:5432/dbname"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      格式：postgresql://帳號:密碼@主機:埠號/資料庫名稱
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                    <p className="font-medium">自動處理項目：</p>
                    <ul className="mt-1 space-y-0.5 text-xs text-blue-700">
                      <li><code className="bg-blue-100 px-1 rounded">JWT_SECRET</code> — 已自動產生</li>
                      <li><code className="bg-blue-100 px-1 rounded">ENCRYPTION_KEY</code> — 已自動產生</li>
                      <li>Database Migration — 連線成功後自動執行</li>
                    </ul>
                  </div>
                </div>
              ) : (
                /* DB connected: show read-only status */
                <div className="space-y-3">
                  <StatusRow
                    label="資料庫連線"
                    description="PostgreSQL 連線是否正常"
                    ok={true}
                    errorHint=""
                  />
                  <StatusRow
                    label="後端服務"
                    description="Express API 是否運行中"
                    ok={true}
                    errorHint=""
                  />
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setCurrentStep(0)} className="flex-1 border border-gray-300 rounded-xl py-2.5 text-sm hover:bg-gray-50">
                  上一步
                </button>
                {dbNeeded ? (
                  <button
                    onClick={async () => {
                      if (!dbUrl.trim()) {
                        toast.error('請輸入連線字串');
                        return;
                      }
                      setDbTesting(true);
                      try {
                        await api.post('/setup/database', { databaseUrl: dbUrl.trim() });
                        toast.success('資料庫連線成功，Migration 已完成');
                        await checkStatus();
                        setCurrentStep(2);
                      } catch (err) {
                        const detail = err.response?.data?.detail || err.response?.data?.error || '連線失敗';
                        toast.error(detail);
                      } finally {
                        setDbTesting(false);
                      }
                    }}
                    disabled={dbTesting || !dbUrl.trim()}
                    className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
                  >
                    {dbTesting ? '連線測試中...' : '測試並連線'}
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentStep(status?.admin?.configured ? 3 : 2)}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
                  >
                    下一步
                  </button>
                )}
              </div>
            </div>
            );
          })()}

          {/* Step 2: Admin Account */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-800">管理員帳號</h2>
                <p className="text-gray-500 text-sm mt-1">
                  {status?.admin ? '系統已有管理員帳號，請登入繼續' : '建立第一個管理員帳號'}
                </p>
              </div>

              <div className="space-y-3">
                {!status?.admin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">名稱</label>
                    <input
                      type="text"
                      value={adminForm.name}
                      onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Admin"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">電子信箱</label>
                  <input
                    type="email"
                    value={adminForm.email}
                    onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="admin@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">密碼</label>
                  <input
                    type="password"
                    value={adminForm.password}
                    onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="至少 6 個字元"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setCurrentStep(1)} className="flex-1 border border-gray-300 rounded-xl py-2.5 text-sm hover:bg-gray-50">
                  上一步
                </button>
                <button
                  onClick={status?.admin ? handleLoginExisting : handleRegister}
                  disabled={saving}
                  className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
                >
                  {saving ? '處理中...' : status?.admin ? '登入' : '建立帳號'}
                </button>
              </div>

              {status?.admin && (
                <p className="text-xs text-gray-400 text-center">
                  預設帳號：admin@example.com / admin123456
                </p>
              )}
            </div>
          )}

          {/* Step 3: LINE Setup */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-800">LINE Messaging API</h2>
                <p className="text-gray-500 text-sm mt-1">填入 LINE Channel 憑證，讓 Bot 能收發訊息</p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                <p className="font-medium">如何取得？</p>
                <ol className="mt-1 space-y-0.5 text-xs list-decimal list-inside">
                  <li>前往 <a href="https://developers.line.biz/" target="_blank" rel="noopener noreferrer" className="underline">LINE Developers Console</a></li>
                  <li>建立 Provider → 建立 <strong>Messaging API Channel</strong></li>
                  <li><strong>Basic Settings</strong> → 取得 Channel Secret</li>
                  <li><strong>Messaging API</strong> → Issue Channel Access Token（long-lived）</li>
                </ol>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Channel Secret</label>
                  <input
                    type="password"
                    value={lineForm.channelSecret}
                    onChange={(e) => setLineForm({ ...lineForm, channelSecret: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
                    placeholder="32 字元英數字串"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Channel Access Token</label>
                  <input
                    type="password"
                    value={lineForm.channelAccessToken}
                    onChange={(e) => setLineForm({ ...lineForm, channelAccessToken: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
                    placeholder="長字串，通常以 = 結尾"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSaveLine}
                  disabled={saving}
                  className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium"
                >
                  {saving ? '儲存中...' : '儲存'}
                </button>
                <button
                  onClick={handleTestLine}
                  disabled={lineTesting}
                  className="px-4 py-2 border border-green-500 text-green-600 rounded-lg text-sm hover:bg-green-50"
                >
                  {lineTesting ? '測試中...' : '測試連線'}
                </button>
              </div>

              {lineTestResult && (
                <div className={`rounded-lg p-3 text-sm ${lineTestResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  {lineTestResult.success ? (
                    <div className="flex items-center gap-3">
                      {lineTestResult.bot.pictureUrl && (
                        <img src={lineTestResult.bot.pictureUrl} className="w-10 h-10 rounded-full" alt="" />
                      )}
                      <div>
                        <p className="font-medium text-green-800">{lineTestResult.bot.displayName}</p>
                        <p className="text-xs text-green-600">Bot ID: {lineTestResult.bot.userId}</p>
                      </div>
                      <span className="ml-auto text-green-600 text-xs font-medium border border-green-300 rounded-full px-2 py-0.5">已連線</span>
                    </div>
                  ) : (
                    <p className="text-red-700">{lineTestResult.message}</p>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setCurrentStep(2)} className="flex-1 border border-gray-300 rounded-xl py-2.5 text-sm hover:bg-gray-50">
                  上一步
                </button>
                <button
                  onClick={() => setCurrentStep(4)}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
                >
                  {status?.line ? '下一步' : '先跳過'}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: LLM Setup */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-800">AI 模型設定</h2>
                <p className="text-gray-500 text-sm mt-1">設定 AI 回覆使用的 LLM 模型</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">LLM 供應商</label>
                  <select
                    value={llmForm.provider}
                    onChange={(e) => {
                      const provider = e.target.value;
                      setLlmForm({ ...llmForm, provider, model: MODEL_PRESETS[provider] || '' });
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="gemini">Google Gemini</option>
                    <option value="openai">OpenAI</option>
                    <option value="claude">Anthropic Claude</option>
                    <option value="custom">Custom（OpenAI 相容）</option>
                  </select>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                  {llmForm.provider === 'gemini' && (
                    <p>前往 <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="underline">Google AI Studio</a> 取得 API Key</p>
                  )}
                  {llmForm.provider === 'openai' && (
                    <p>前往 <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">OpenAI Platform</a> 取得 API Key</p>
                  )}
                  {llmForm.provider === 'claude' && (
                    <p>前往 <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="underline">Anthropic Console</a> 取得 API Key</p>
                  )}
                  {llmForm.provider === 'custom' && (
                    <p>填入任何 OpenAI 相容 API 的 Key 和 Base URL</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                  <input
                    type="password"
                    value={llmForm.apiKey}
                    onChange={(e) => setLlmForm({ ...llmForm, apiKey: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
                    placeholder={llmForm.provider === 'gemini' ? 'AIzaSy...' : llmForm.provider === 'openai' ? 'sk-...' : 'sk-ant-...'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">模型名稱</label>
                  <input
                    type="text"
                    value={llmForm.model}
                    onChange={(e) => setLlmForm({ ...llmForm, model: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="模型名稱"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSaveLLM}
                  disabled={saving}
                  className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium"
                >
                  {saving ? '儲存中...' : '儲存'}
                </button>
                <button
                  onClick={handleTestLLM}
                  disabled={llmTesting}
                  className="px-4 py-2 border border-green-500 text-green-600 rounded-lg text-sm hover:bg-green-50"
                >
                  {llmTesting ? '測試中...' : '測試連線'}
                </button>
              </div>

              {llmTestResult && (
                <div className={`rounded-lg p-3 text-sm ${llmTestResult.success ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                  {llmTestResult.success
                    ? `連線成功！模型：${llmTestResult.model}`
                    : llmTestResult.message}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setCurrentStep(3)} className="flex-1 border border-gray-300 rounded-xl py-2.5 text-sm hover:bg-gray-50">
                  上一步
                </button>
                <button
                  onClick={() => { checkStatus(); setCurrentStep(5); }}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
                >
                  {status?.llm ? '下一步' : '先跳過'}
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Complete */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">
                    {status?.setupComplete ? '🎉' : '⚠️'}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-gray-800">
                  {status?.setupComplete ? '設定完成！' : '部分設定尚未完成'}
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  {status?.setupComplete
                    ? '系統已就緒，可以開始使用了'
                    : '你可以之後在「系統設定」頁面補完'}
                </p>
              </div>

              <div className="space-y-2">
                <StatusRow label="資料庫" description="PostgreSQL 連線" ok={status?.database} />
                <StatusRow label="管理員帳號" description="登入帳號" ok={status?.admin} />
                <StatusRow label="LINE 串接" description="Channel Secret + Token" ok={status?.line} />
                <StatusRow label="AI 模型" description="LLM API Key" ok={status?.llm} />
              </div>

              {!status?.setupComplete && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  <p>未完成的項目可以之後在「系統設定」頁面設定。</p>
                  {!status?.line && (
                    <p className="mt-1 text-xs">LINE 未設定 → Bot 無法收發訊息</p>
                  )}
                  {!status?.llm && (
                    <p className="mt-1 text-xs">AI 未設定 → Bot 不會自動回覆</p>
                  )}
                </div>
              )}

              {status?.setupComplete && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800 space-y-1">
                  <p className="font-medium">下一步建議：</p>
                  <ul className="text-xs space-y-0.5 list-disc list-inside">
                    <li>前往 LINE Developers Console 設定 Webhook URL</li>
                    <li>上傳知識庫 PDF 文件，啟用 RAG 搜尋</li>
                    <li>設定 AI 排程時段（預設 24/7）</li>
                    <li>傳訊息給 Bot 測試自動回覆</li>
                  </ul>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setCurrentStep(4)} className="flex-1 border border-gray-300 rounded-xl py-2.5 text-sm hover:bg-gray-50">
                  上一步
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
                >
                  進入管理後台
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChecklistItem({ label, hint }) {
  return (
    <div className="flex items-start gap-2">
      <div className="w-5 h-5 rounded border-2 border-gray-300 flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-xs text-gray-400">?</span>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <p className="text-xs text-gray-400">{hint}</p>
      </div>
    </div>
  );
}

function StatusRow({ label, description, ok, errorHint }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${ok ? 'bg-green-100' : 'bg-red-100'}`}>
        <span className="text-sm">{ok ? '✓' : '✗'}</span>
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <p className="text-xs text-gray-400">{description}</p>
        {!ok && errorHint && <p className="text-xs text-red-500 mt-0.5">{errorHint}</p>}
      </div>
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
        {ok ? '已完成' : '未設定'}
      </span>
    </div>
  );
}
