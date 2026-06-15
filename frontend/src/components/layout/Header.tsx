import { useApp } from '../../context/AppContext';
import type { PageKey } from '../../types';

const NAV_ITEMS: Array<{ id: PageKey; label: string; icon: string }> = [
  { id: 'landing',  label: '概览',    icon: '🏠' },
  { id: 'phase1',   label: '需求收集', icon: '📝' },
  { id: 'phase2',   label: '需求开发', icon: '🛠️' },
  { id: 'phase3',   label: 'GTM',     icon: '🚀' },
];

export default function Header() {
  const { state, navigate } = useApp();

  return (
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

        {/* 右侧：数据摘要 */}
        <div className="hidden md:flex items-center gap-4 text-xs text-gray-400">
          <span>{state.stats.ideaCount} 个点子</span>
          <span>·</span>
          <span>{state.stats.activeProjectCount} 个进行中</span>
          <span>·</span>
          <span>{state.stats.launchedProductCount} 个已上线</span>
        </div>
      </div>
    </header>
  );
}
