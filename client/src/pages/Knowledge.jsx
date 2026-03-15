import React, { useEffect, useState, useRef } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

const STATUS_LABELS = { processing: '處理中', ready: '就緒', error: '錯誤' };
const STATUS_COLORS = { processing: 'bg-yellow-100 text-yellow-700', ready: 'bg-green-100 text-green-700', error: 'bg-red-100 text-red-700' };

function formatBytes(bytes) {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function TestQueryPanel() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showRagContext, setShowRagContext] = useState(false);

  const handleTest = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    setShowRagContext(false);
    try {
      const res = await api.post('/files/test-query', { query: query.trim() });
      setResult(res.data);
    } catch (err) {
      toast.error('測試失敗: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTest();
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <h2 className="font-semibold text-gray-800">🔍 測試查詢</h2>
      <p className="text-sm text-gray-500">輸入問題，測試是否命中知識庫（RAG），並查看 AI 最終回答。</p>

      <div className="flex gap-2">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="輸入測試問題，例如：退換貨政策是什麼？"
          rows={2}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          onClick={handleTest}
          disabled={loading || !query.trim()}
          className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 disabled:opacity-50 self-start"
        >
          {loading ? '查詢中...' : '測試'}
        </button>
      </div>

      {result && (
        <div className="space-y-3 pt-1">
          {/* RAG Hit/Miss Badge */}
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
              result.ragHit ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {result.ragHit ? '✅ 命中知識庫' : '❌ 未命中知識庫（LLM 直接回答）'}
            </span>
            <span className="text-xs text-gray-400">provider: {result.provider} | model: {result.model}</span>
          </div>

          {/* RAG Context (collapsible) */}
          {result.ragHit && (
            <div className="border border-green-200 rounded-lg overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-4 py-2 bg-green-50 text-sm font-medium text-green-700 hover:bg-green-100"
                onClick={() => setShowRagContext((v) => !v)}
              >
                <span>📄 知識庫命中內容 {result.ragCitations?.length > 0 && `（引用 ${result.ragCitations.length} 個片段）`}</span>
                <span>{showRagContext ? '▲' : '▼'}</span>
              </button>
              {showRagContext && (
                <div className="px-4 py-3 bg-green-50 text-xs text-gray-700 whitespace-pre-wrap max-h-60 overflow-y-auto font-mono border-t border-green-200">
                  {result.ragContext}
                </div>
              )}
            </div>
          )}

          {/* No RAG reason */}
          {!result.ragHit && result.ragReason && (
            <p className="text-xs text-gray-400">原因：{result.ragReason}</p>
          )}

          {/* AI Response */}
          <div className="border border-blue-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-blue-50 text-sm font-medium text-blue-700">
              🤖 AI 回答
              {result.ragHit
                ? <span className="ml-2 text-xs font-normal text-blue-500">（根據知識庫內容回答）</span>
                : <span className="ml-2 text-xs font-normal text-blue-500">（根據模型訓練資料回答）</span>
              }
            </div>
            <div className="px-4 py-3 text-sm text-gray-800 whitespace-pre-wrap bg-white">
              {result.response}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Knowledge() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const fetchFiles = async (silent = false) => {
    try {
      const res = await api.get('/files');
      setFiles(res.data);
    } catch (err) {
      if (!silent) toast.error('載入失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFiles(); }, []);

  // Auto-poll while any file is still processing
  useEffect(() => {
    const hasProcessing = files.some((f) => f.status === 'processing');
    if (!hasProcessing) return;
    const timer = setInterval(() => fetchFiles(true), 3000);
    return () => clearInterval(timer);
  }, [files]);

  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    setUploading(true);
    try {
      const res = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setFiles((prev) => [res.data, ...prev]);
      toast.success('上傳成功，正在處理...');
    } catch (err) {
      toast.error('上傳失敗: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  const deleteFile = async (id) => {
    if (!confirm('確定刪除此檔案？將同步從知識庫移除。')) return;
    try {
      await api.delete(`/files/${id}`);
      setFiles((prev) => prev.filter((f) => f.id !== id));
      toast.success('已刪除');
    } catch (err) {
      toast.error('刪除失敗');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">知識庫管理</h1>

      {/* Upload zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          dragOver ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".pdf,.docx,.txt,.csv"
          onChange={(e) => { if (e.target.files[0]) uploadFile(e.target.files[0]); }}
        />
        <div className="text-4xl mb-3">📄</div>
        {uploading ? (
          <p className="text-gray-600">上傳中...</p>
        ) : (
          <>
            <p className="font-medium text-gray-700">拖放檔案到此，或點擊上傳</p>
            <p className="text-sm text-gray-500 mt-1">支援 PDF、DOCX、TXT、CSV（最大 50MB）</p>
          </>
        )}
      </div>

      {/* File list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">檔名</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">大小</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">狀態</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">上傳時間</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400">載入中...</td></tr>
            ) : files.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400">尚未上傳任何檔案</td></tr>
            ) : files.map((file) => (
              <tr key={file.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{file.original_name}</td>
                <td className="px-4 py-3 text-gray-500">{formatBytes(file.file_size)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[file.status] || ''}`}>
                    {STATUS_LABELS[file.status] || file.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{dayjs(file.created_at).format('MM/DD HH:mm')}</td>
                <td className="px-4 py-3">
                  <button onClick={() => deleteFile(file.id)} className="text-xs text-red-500 hover:underline">刪除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Test Query Panel */}
      <TestQueryPanel />
    </div>
  );
}
