import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { signOut } from '../../utils/api';
import type { PageKey } from '../../types';
import { useState } from 'react';
import AdminPanel from '../shared/AdminPanel';

const NAV_ITEMS: Array<{ id: PageKey; label: string; icon: string }> = [
  { id: 'landing',  label: '概览',    icon: '🏠' },
  { id: 'phase1',   label: '需求收集', icon: '📝' },
  { id: 'phase2',   label: '需求开发', icon: '🛠️' },
  { id: 'phase3',   label: 'GTM',     icon: '🚀' },
];

export default function Header() {
  const { state, navigate } = useApp();
  const { profile, isAdmin } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  async function handleSignOut() {
    await signOut();
    setShowUserMenu(false);
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <button
            className="flex items-center gap-2 font-bold text-gray-900 hover:text-indigo-600 transition-colors"
            onClick={() => navigate('landing')}
          >
            <span className="text-xl">🎯</span>
            <span className="text-base tracking-tight">01计划</span>
          </button>

          {/* Navigation */}
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map(item => {
              const isActive = state.currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.id)}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                    ${isActive
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'}
                  `}
                >
                  <span>{item.icon}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* 右侧：用户信息 */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-3 text-xs text-gray-400">
              <span>{state.stats.ideaCount} 点子</span>
              <span>·</span>
              <span>{state.stats.activeProjectCount} 进行中</span>
              <span>·</span>
              <span>{state.stats.launchedProductCount} 已上线</span>
            </div>

            {profile && (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(v => !v)}
                  className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 text-xs font-semibold">
                    {profile.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-gray-700 hidden sm:inline">{profile.username}</span>
                  {isAdmin && <span className="badge bg-indigo-100 text-indigo-700 text-xs">管理员</span>}
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-10 w-44 bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-50">
                    {isAdmin && (
                      <button
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => { setShowAdmin(true); setShowUserMenu(false); }}
                      >
                        ⚙️ 管理后台
                      </button>
                    )}
                    <div className="border-t border-gray-100 my-1" />
                    <button
                      className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50"
                      onClick={handleSignOut}
                    >
                      退出登录
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}

      {/* 点击其他区域关闭菜单 */}
      {showUserMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
      )}
    </>
  );
}
