import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../services/api';
import dayjs from 'dayjs';

const COLORS = ['#00B900', '#e5e7eb'];

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/messages/dashboard')
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-200 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  const pieData = data ? [
    { name: 'AI 回覆', value: data.ai_reply_count },
    { name: '人工回覆', value: data.total_reply_count - data.ai_reply_count },
  ] : [];

  const trendData = (data?.trend || []).map((t) => ({
    date: dayjs(t.date).format('MM/DD'),
    訊息數: parseInt(t.count),
  }));

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">儀表板</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="今日訊息" value={data?.today_messages ?? 0} sub="inbound + outbound" />
        <StatCard label="今日活躍用戶" value={data?.today_users ?? 0} />
        <StatCard label="AI 回覆次數" value={data?.ai_reply_count ?? 0} sub="今日" />
        <StatCard label="AI 回覆率" value={`${data?.ai_ratio ?? 0}%`} sub="今日 outbound" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-medium text-gray-700 mb-4">最近 7 天訊息趨勢</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData}>
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="訊息數" stroke="#00B900" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-medium text-gray-700 mb-4">今日回覆比例</h2>
          {data?.total_reply_count > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              今日尚無回覆資料
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
