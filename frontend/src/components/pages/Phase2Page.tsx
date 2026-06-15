import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useApp } from '../../context/AppContext';
import type { Project, ProjectStatus, ProjectPhase, IdeaCategory } from '../../types';
import { CATEGORY_MAP, PROJECT_STATUS_MAP } from '../../utils/constants';
import { timeAgo } from '../../utils/calculations';

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

// ============ 项目详情弹窗 ============
function ProjectDetailModal({ project, onSave, onClose }: {
  project: Project;
  onSave: (p: Project) => void;
  onClose: () => void;
}) {
  const [phases, setPhases] = useState<ProjectPhase[]>(project.phases);
  const [techStack, setTechStack] = useState(project.techStack);

  function togglePhase(phaseId: string) {
    setPhases(prev => prev.map(p => {
      if (p.id !== phaseId) return p;
      const next: ProjectPhase = {
        ...p,
        status: p.status === 'completed' ? 'pending'
          : p.status === 'pending' ? 'in-progress'
          : 'completed',
        completedAt: p.status === 'in-progress' ? new Date().toISOString() : undefined,
        startedAt: p.status === 'pending' ? new Date().toISOString() : p.startedAt,
      };
      return next;
    }));
  }

  function handleSave() {
    const completed = phases.filter(p => p.status === 'completed').length;
    const progress = phases.length ? Math.round((completed / phases.length) * 100) : 0;
    let status: ProjectStatus = project.status;
    if (progress === 100) status = 'completed';
    else if (progress > 0) status = 'in-progress';

    onSave({ ...project, phases, techStack, progress, status, updatedAt: new Date().toISOString() });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg my-8 p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">{project.name}</h2>
        <p className="text-sm text-gray-500 mb-4">{project.description}</p>

        {/* 阶段列表 */}
        <div className="mb-4">
          <label className="label">开发阶段（点击切换状态）</label>
          <div className="space-y-2">
            {phases.map(phase => (
              <div
                key={phase.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  phase.status === 'completed' ? 'border-green-200 bg-green-50'
                  : phase.status === 'in-progress' ? 'border-blue-200 bg-blue-50'
                  : 'border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => togglePhase(phase.id)}
              >
                <span className="text-lg">
                  {phase.status === 'completed' ? '✅' : phase.status === 'in-progress' ? '▶️' : '⬜'}
                </span>
                <span className={`text-sm font-medium ${
                  phase.status === 'completed' ? 'text-green-700 line-through' : 'text-gray-800'
                }`}>{phase.name}</span>
                <span className="ml-auto text-xs text-gray-400">
                  {phase.status === 'completed' ? '已完成' : phase.status === 'in-progress' ? '进行中' : '待开始'}
                </span>
              </div>
            ))}
          </div>
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

  const getDefaultPhases = (category: IdeaCategory): ProjectPhase[] => {
    const templates: Record<string, string[]> = {
      app: ['需求分析', 'UI设计', '前端开发', '后端开发', '测试', '发布'],
      web: ['原型设计', '前端开发', '后端集成', '测试', '部署'],
      'mini-program': ['原型设计', '前端开发', '接口联调', '测试', '审核发布'],
      agent: ['Prompt设计', '功能开发', '测试调优', '集成部署'],
      tool: ['方案设计', '核心开发', '测试', '文档'],
      content: ['内容策划', '生产制作', '发布推广', '复盘优化'],
      hardware: ['方案设计', '原型制作', '测试验证', '量产'],
      other: ['规划设计', '开发实现', '测试验证', '发布'],
    };
    return (templates[category] || templates.other).map(n => ({
      id: uuidv4(), name: n, description: '', status: 'pending',
    }));
  };

  function handleCreate() {
    if (!name.trim()) return;
    const now = new Date().toISOString();
    const phases = getDefaultPhases(cat);
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
        <span>{project.phases.filter(p => p.status === 'completed').length}/{project.phases.length} 阶段</span>
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
  const { state, saveProject, removeProject } = useApp();
  const { projects } = state;

  const [showCreate, setShowCreate] = useState(false);
  const [detailProject, setDetailProject] = useState<Project | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');

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
          onSave={saveProject}
          onClose={() => setDetailProject(null)}
        />
      )}
    </div>
  );
}
