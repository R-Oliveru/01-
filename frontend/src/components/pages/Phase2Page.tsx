import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useApp } from '../../context/AppContext';
import { getDefaultPhases } from '../../context/AppContext';
import type { Project, ProjectStatus, ProjectPhase, IdeaCategory } from '../../types';
import { CATEGORY_MAP, PROJECT_STATUS_MAP } from '../../utils/constants';
import { timeAgo, calcProjectProgress } from '../../utils/calculations';

const STATUS_COLUMNS: ProjectStatus[] = ['planning', 'in-progress', 'testing', 'completed'];

// ============ 进度条 ============
function ProgressBar({ value }: { value: number }) {
  const color = value >= 100 ? 'bg-green-500' : value >= 60 ? 'bg-blue-500' : value >= 30 ? 'bg-yellow-500' : 'bg-gray-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-8 text-right">{value}%</span>
    </div>
  );
}

// ============ 项目详情弹窗（新逻辑）============
function ProjectDetailModal({ project, onSave, onClose }: {
  project: Project;
  onSave: (p: Project) => void;
  onClose: () => void;
}) {
  const [phases, setPhases] = useState<ProjectPhase[]>(project.phases);
  const [techStack, setTechStack] = useState(project.techStack);

  // 切换阶段完成状态（仅 included 的阶段响应点击）
  function togglePhaseComplete(phaseId: string) {
    setPhases(prev => prev.map(p => {
      if (p.id !== phaseId || !p.included) return p;
      const done = p.status !== 'completed';
      return {
        ...p,
        status: done ? 'completed' : 'pending',
        completedAt: done ? new Date().toISOString() : undefined,
        startedAt: done && !p.startedAt ? new Date().toISOString() : p.startedAt,
      };
    }));
  }

  // 切换阶段是否纳入（非固定阶段可取消勾选）
  function togglePhaseIncluded(phaseId: string) {
    setPhases(prev => prev.map(p => {
      if (p.id !== phaseId || p.isFixed) return p;
      return { ...p, included: !p.included, status: 'pending', completedAt: undefined };
    }));
  }

  function handleSave() {
    const progress = calcProjectProgress(phases);
    const allIncludedDone = phases.filter(p => p.included).every(p => p.status === 'completed');
    const hasStarted = phases.some(p => p.included && p.status !== 'pending');

    // 自动判断项目状态
    let status: ProjectStatus = project.status;
    if (allIncludedDone && phases.filter(p => p.included).length > 0) {
      status = 'completed';
    } else if (hasStarted) {
      // 如果测试阶段以前的阶段全完成，进入测试中
      const devPhases = phases.filter(p => p.included && !p.isFixed);
      const allDevDone = devPhases.length > 0 && devPhases.every(p => p.status === 'completed');
      status = allDevDone ? 'testing' : 'in-progress';
    } else {
      status = 'planning';
    }

    onSave({ ...project, phases, techStack, progress, status, updatedAt: new Date().toISOString() });
    onClose();
  }

  const includedCount = phases.filter(p => p.included).length;
  const completedCount = phases.filter(p => p.included && p.status === 'completed').length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg my-8 p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">{project.name}</h2>
        <p className="text-sm text-gray-500 mb-4">{project.description}</p>

        {/* 阶段管理 */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="label mb-0">开发阶段</label>
            <span className="text-xs text-gray-400">{completedCount}/{includedCount} 已完成</span>
          </div>

          {/* 说明 */}
          <p className="text-xs text-gray-400 mb-3">
            ☑ 勾选的阶段才纳入进度计算 · 点击完成状态切换 · 测试&发布为固定阶段
          </p>

          <div className="space-y-2">
            {phases.map((phase) => {
              const isLastTwo = phase.isFixed;
              const isIncluded = phase.included;
              return (
                <div
                  key={phase.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    !isIncluded ? 'border-gray-100 bg-gray-50 opacity-50'
                    : phase.status === 'completed' ? 'border-green-200 bg-green-50'
                    : 'border-gray-200 bg-white'
                  }`}
                >
                  {/* 勾选框（是否纳入该阶段） */}
                  <button
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      isLastTwo
                        ? 'border-indigo-300 bg-indigo-50 cursor-not-allowed'
                        : isIncluded
                        ? 'border-indigo-500 bg-indigo-500'
                        : 'border-gray-300'
                    }`}
                    onClick={() => togglePhaseIncluded(phase.id)}
                    title={isLastTwo ? '固定阶段，不可取消' : isIncluded ? '点击排除此阶段' : '点击纳入此阶段'}
                  >
                    {(isIncluded || isLastTwo) && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>

                  {/* 阶段名称 */}
                  <span className={`text-sm font-medium flex-1 ${
                    !isIncluded ? 'text-gray-400 line-through'
                    : phase.status === 'completed' ? 'text-green-700' : 'text-gray-800'
                  }`}>
                    {phase.name}
                    {isLastTwo && <span className="ml-1 text-xs text-indigo-400">(固定)</span>}
                  </span>

                  {/* 完成切换按钮（仅 included 阶段） */}
                  {isIncluded && (
                    <button
                      onClick={() => togglePhaseComplete(phase.id)}
                      className={`text-xs px-2 py-1 rounded-md border transition-colors ${
                        phase.status === 'completed'
                          ? 'border-green-300 bg-green-100 text-green-700 hover:bg-green-200'
                          : 'border-gray-200 text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      {phase.status === 'completed' ? '✓ 已完成' : '标记完成'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 进度预览 */}
        <div className="mb-5 p-3 bg-gray-50 rounded-lg">
          <ProgressBar value={calcProjectProgress(phases)} />
        </div>

        {/* 技术栈 */}
        <div className="mb-5 space-y-2">
          <label className="label">技术栈</label>
          {(['frontend', 'backend', 'database'] as const).map(key => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-16">{key === 'frontend' ? '前端' : key === 'backend' ? '后端' : '数据库'}</span>
              <input
                className="input text-sm py-1.5"
                value={techStack[key] || ''}
                onChange={e => setTechStack(prev => ({ ...prev, [key]: e.target.value }))}
                placeholder={`${key}...`}
              />
            </div>
          ))}
        </div>

        <div className="flex gap-2 justify-end">
          <button className="btn-secondary" onClick={onClose}>取消</button>
          <button className="btn-primary" onClick={handleSave}>保存进度</button>
        </div>
      </div>
    </div>
  );
}

// ============ 新建项目弹窗 ============
function CreateProjectModal({ onSave, onClose }: { onSave: (p: Project) => void; onClose: () => void }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [cat, setCat] = useState<IdeaCategory>('app');

  function handleCreate() {
    if (!name.trim()) return;
    const now = new Date().toISOString();
    const phases = getDefaultPhases(cat, uuidv4);
    onSave({
      id: uuidv4(), name: name.trim(), description: desc.trim(),
      category: cat, status: 'planning',
      phases, techStack: {}, progress: 0,
      createdAt: now, updatedAt: now,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">新建开发项目</h2>
        <div className="space-y-4">
          <div>
            <label className="label">项目名称 *</label>
            <input className="input" placeholder="项目名称..." value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">项目描述</label>
            <textarea className="input resize-none" rows={2} placeholder="简短描述..." value={desc} onChange={e => setDesc(e.target.value)} />
          </div>
          <div>
            <label className="label">分类</label>
            <select className="input" value={cat} onChange={e => setCat(e.target.value as IdeaCategory)}>
              {Object.entries(CATEGORY_MAP).map(([val, info]) => (
                <option key={val} value={val}>{info.icon} {info.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-5">
          <button className="btn-secondary" onClick={onClose}>取消</button>
          <button className="btn-primary" disabled={!name.trim()} onClick={handleCreate}>创建</button>
        </div>
      </div>
    </div>
  );
}

// ============ 项目卡片 ============
function ProjectCard({ project, onClick, onDelete }: {
  project: Project;
  onClick: () => void;
  onDelete: () => void;
}) {
  const cat = CATEGORY_MAP[project.category];
  const statusInfo = PROJECT_STATUS_MAP[project.status];
  return (
    <div className="card p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{cat?.icon}</span>
        <span className="font-semibold text-gray-900 truncate flex-1">{project.name}</span>
        <span className={`badge ${statusInfo.color} text-xs`}>{statusInfo.label}</span>
      </div>
      {project.description && (
        <p className="text-xs text-gray-500 line-clamp-1 mb-2">{project.description}</p>
      )}
      <ProgressBar value={project.progress} />
      <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
        <span>
          {project.phases.filter(p => p.included !== false && p.status === 'completed').length}/
          {project.phases.filter(p => p.included !== false).length} 阶段
        </span>
        <div className="flex items-center gap-2">
          <span>{timeAgo(project.updatedAt)}</span>
          <button
            className="text-red-400 hover:text-red-600 transition-colors"
            onClick={e => { e.stopPropagation(); onDelete(); }}
          >删除</button>
        </div>
      </div>
    </div>
  );
}

// ============ 主页面 ============
export default function Phase2Page() {
  const { state, saveProject, removeProject, navigate } = useApp();
  const { projects } = state;

  const [showCreate, setShowCreate] = useState(false);
  const [detailProject, setDetailProject] = useState<Project | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  }

  async function handleSaveProject(p: Project) {
    const wasComplete = state.projects.find(x => x.id === p.id)?.status === 'completed';
    await saveProject(p);
    if (p.status === 'completed' && !wasComplete) {
      showToast(`🎉 "${p.name}" 已完成，已自动添加到 GTM！`);
    }
  }

  const filtered = projects.filter(p => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // 看板视图按状态分组
  const grouped: Record<ProjectStatus, Project[]> = {
    planning: [], 'in-progress': [], testing: [], completed: [], paused: [], cancelled: [],
  };
  filtered.forEach(p => grouped[p.status]?.push(p));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">🛠️ 需求开发</h2>
          <p className="text-sm text-gray-500 mt-1">管理开发项目，跟踪每个阶段的进度</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>+ 新建项目</button>
      </div>

      {/* 筛选 */}
      <div className="flex flex-wrap items-center gap-3">
        <input className="input w-48 text-sm" placeholder="🔍 搜索项目..." value={search} onChange={e => setSearch(e.target.value)} />
        <div className="flex gap-1">
          {[['all', '全部'], ...STATUS_COLUMNS.map(s => [s, PROJECT_STATUS_MAP[s].label])].map(([val, lbl]) => (
            <button
              key={val}
              onClick={() => setFilterStatus(val as string)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === val ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
        <span className="text-sm text-gray-400 ml-auto">{filtered.length} 个项目</span>
      </div>

      {/* 看板 */}
      {projects.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <div className="text-4xl mb-3">🏗️</div>
          <div className="text-sm mb-4">还没有开发项目</div>
          <button className="btn-primary text-sm" onClick={() => setShowCreate(true)}>新建第一个项目</button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          {STATUS_COLUMNS.map(col => {
            const colProjects = grouped[col];
            return (
              <div key={col} className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className={`badge ${PROJECT_STATUS_MAP[col].color}`}>{PROJECT_STATUS_MAP[col].label}</span>
                  <span className="text-xs text-gray-400">({colProjects.length})</span>
                </div>
                {colProjects.map(p => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    onClick={() => setDetailProject(p)}
                    onDelete={() => removeProject(p.id)}
                  />
                ))}
                {colProjects.length === 0 && (
                  <div className="card p-4 text-center text-gray-300 text-xs border-dashed">暂无项目</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateProjectModal onSave={saveProject} onClose={() => setShowCreate(false)} />
      )}
      {detailProject && (
        <ProjectDetailModal
          project={detailProject}
          onSave={p => { handleSaveProject(p); setDetailProject(null); }}
          onClose={() => setDetailProject(null)}
        />
      )}

      {/* Toast 通知 */}
      {toast && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm px-5 py-3 rounded-xl shadow-lg flex items-center gap-3">
          <span>{toast}</span>
          <button className="text-white/60 hover:text-white ml-2" onClick={() => navigate('phase3')}>前往 GTM →</button>
        </div>
      )}
    </div>
  );
}
