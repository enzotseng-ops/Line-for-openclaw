import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const navItems = [
  { path: '/dashboard', label: '儀表板', icon: '📊' },
  { path: '/users', label: '用戶管理', icon: '👥' },
  { path: '/messages', label: '訊息紀錄', icon: '💬' },
  { path: '/schedules', label: '排程設定', icon: '🕐' },
  { path: '/knowledge', label: '知識庫', icon: '📚' },
  { path: '/settings', label: '系統設定', icon: '⚙️' },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">L</span>
            </div>
            <div>
              <p className="font-semibold text-sm">LINE 智能客服</p>
              <p className="text-xs text-gray-500">無毒農</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-green-50 text-green-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-200">
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="w-7 h-7 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-xs">{user?.name?.[0] || user?.email?.[0] || 'A'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{user?.name || user?.email}</p>
            </div>
            <button onClick={handleLogout} className="text-xs text-red-500 hover:text-red-700">
              登出
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
