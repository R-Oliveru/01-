import { useApp } from '../../context/AppContext';
import { formatNumber } from '../../utils/calculations';
import { timeAgo } from '../../utils/calculations';
import { CATEGORY_MAP, REVIEW_STATUS_MAP } from '../../utils/constants';

function StatCard({
  icon, label, value, sub, color,
}: { icon: string; label: string; value: number | string; sub?: string; color: string }) {
  return (
    <div className={`card p-5 flex flex-col gap-1 border-l-4 ${color}`}>
      <div className="flex items-center gap-2 text-gray-500 text-sm">
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-400">{sub}</div>}
    </div>
  );
}

export default function LandingPage() {
  const { state, navigate } = useApp();
  const { stats, ideas, projects } = state;

  // 最近5条活动
  const recentIdeas = [...ideas]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);
  const recentProjects = [...projects]
    .filter(p => p.status === 'in-progress')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center py-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">
          🎯 01计划
        </h1>
        <p className="text-lg text-gray-500 max-w-lg mx-auto">
          打造 100 个产品，相信其中有一次会成功
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button className="btn-primary text-sm px-5 py-2.5" onClick={() => navigate('phase1')}>
            💡 添加新点子
          </button>
          <button className="btn-secondary text-sm px-5 py-2.5" onClick={() => navigate('phase2')}>
            🛠️ 查看开发项目
          </button>
          <button className="btn-secondary text-sm px-5 py-2.5" onClick={() => navigate('phase3')}>
            🚀 管理产品数据
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon="💡" label="点子池"
          value={formatNumber(stats.ideaCount)}
          sub={`${stats.approvedIdeaCount} 个已采纳`}
          color="border-indigo-400"
        />
        <StatCard
          icon="🛠️" label="开发中"
          value={formatNumber(stats.activeProjectCount)}
          sub={`共 ${stats.projectCount} 个项目`}
          color="border-blue-400"
        />
        <StatCard
          icon="🚀" label="已上线"
          value={formatNumber(stats.launchedProductCount)}
          sub={`共 ${stats.productCount} 个产品`}
          color="border-green-400"
        />
        <StatCard
          icon="👥" label="累计用户"
          value={formatNumber(stats.totalUsers)}
          sub="所有产品合计"
          color="border-purple-400"
        />
      </div>

      {/* 进度概览 */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* 阶段漏斗 */}
        <div className="card p-5 md:col-span-1">
          <h3 className="font-semibold text-gray-800 mb-4">📊 产品孵化漏斗</h3>
          <div className="space-y-3">
            {[
              { label: '点子收集', count: stats.ideaCount,           color: 'bg-indigo-500', total: Math.max(stats.ideaCount, 1) },
              { label: '进入开发', count: stats.projectCount,        color: 'bg-blue-500',   total: Math.max(stats.ideaCount, 1) },
              { label: '产品上线', count: stats.launchedProductCount, color: 'bg-green-500',  total: Math.max(stats.ideaCount, 1) },
            ].map(row => (
              <div key={row.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{row.label}</span>
                  <span className="font-medium text-gray-900">{row.count}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${row.color} rounded-full transition-all`}
                    style={{ width: `${Math.min(100, (row.count / row.total) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 最近点子 */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">💡 最新点子</h3>
            <button className="text-xs text-indigo-600 hover:underline" onClick={() => navigate('phase1')}>
              全部 →
            </button>
          </div>
          {recentIdeas.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm">
              <div className="text-3xl mb-2">📭</div>
              <div>还没有点子，快去添加吧</div>
              <button className="mt-3 btn-primary text-xs py-1.5 px-3" onClick={() => navigate('phase1')}>
                添加点子
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentIdeas.map(idea => {
                const cat = CATEGORY_MAP[idea.category];
                const review = idea.manualReview;
                return (
                  <div key={idea.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => navigate('phase1')}>
                    <span className="text-lg mt-0.5">{cat?.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{idea.title}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {review && (
                          <span className={`badge ${REVIEW_STATUS_MAP[review.status]?.color}`}>
                            {REVIEW_STATUS_MAP[review.status]?.label}
                          </span>
                        )}
                        {idea.aiScores && (
                          <span className="text-xs text-gray-400">AI {idea.aiScores.overall}分</span>
                        )}
                        <span className="text-xs text-gray-400">{timeAgo(idea.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 进行中的项目 */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">🛠️ 进行中项目</h3>
            <button className="text-xs text-indigo-600 hover:underline" onClick={() => navigate('phase2')}>
              全部 →
            </button>
          </div>
          {recentProjects.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm">
              <div className="text-3xl mb-2">🏗️</div>
              <div>暂无进行中的项目</div>
              <button className="mt-3 btn-primary text-xs py-1.5 px-3" onClick={() => navigate('phase2')}>
                新建项目
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentProjects.map(proj => {
                const cat = CATEGORY_MAP[proj.category];
                return (
                  <div key={proj.id} className="p-2 rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => navigate('phase2')}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span>{cat?.icon}</span>
                      <span className="text-sm font-medium text-gray-900 truncate flex-1">{proj.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${proj.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 w-8 text-right">{proj.progress}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 快速指南（仅首次） */}
      {stats.ideaCount === 0 && stats.projectCount === 0 && (
        <div className="card p-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
          <h3 className="font-semibold text-indigo-900 mb-3">🚀 开始你的产品孵化之旅</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold flex-shrink-0">1</div>
              <div>
                <div className="font-medium text-gray-900">收集点子</div>
                <div className="text-gray-500 mt-0.5">记录所有创意，AI 自动评分筛选</div>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold flex-shrink-0">2</div>
              <div>
                <div className="font-medium text-gray-900">推进开发</div>
                <div className="text-gray-500 mt-0.5">分阶段管理，跟踪进度</div>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold flex-shrink-0">3</div>
              <div>
                <div className="font-medium text-gray-900">记录增长</div>
                <div className="text-gray-500 mt-0.5">追踪用户、收入、复盘经验</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
