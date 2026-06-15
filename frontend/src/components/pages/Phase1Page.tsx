import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import type { Idea, IdeaCategory, ReviewStatus, Priority } from '../../types';
import { scoreIdea } from '../../utils/aiScoring';
import { CATEGORY_MAP, REVIEW_STATUS_MAP } from '../../utils/constants';
import { timeAgo } from '../../utils/calculations';

const CATEGORIES = Object.entries(CATEGORY_MAP) as [IdeaCategory, { label: string; icon: string; color: string }][];

// ============ 分数徽章 ============
function ScoreBadge({ score }: { score: number }) {
  const color = score >= 8 ? 'text-green-600 bg-green-50'
    : score >= 6 ? 'text-blue-600 bg-blue-50'
    : score >= 4 ? 'text-yellow-600 bg-yellow-50'
    : 'text-red-600 bg-red-50';
  return <span className={`badge ${color} font-semibold`}>{score.toFixed(1)}</span>;
}

// ============ 点子卡片 ============
function IdeaCard({ idea, onReview, onDelete, onConvert }: {
  idea: Idea;
  onReview: (idea: Idea) => void;
  onDelete: (id: string) => void;
  onConvert: (idea: Idea) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const cat = CATEGORY_MAP[idea.category];
  const review = idea.manualReview;
  const statusInfo = review ? REVIEW_STATUS_MAP[review.status] : null;

  return (
    <div className="card p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <span className="text-2xl mt-0.5">{cat?.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 truncate">{idea.title}</h3>
            <span className={`badge ${cat?.color}`}>{cat?.label}</span>
            {statusInfo && (
              <span className={`badge ${statusInfo.color}`}>
                {statusInfo.icon} {statusInfo.label}
              </span>
            )}
          </div>
          <p className={`text-sm text-gray-500 mt-1 ${expanded ? '' : 'line-clamp-2'}`}>
            {idea.description}
          </p>
          {idea.customTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {idea.customTags.map(tag => (
                <span key={tag} className="badge bg-gray-100 text-gray-600">#{tag}</span>
              ))}
            </div>
          )}

          {/* AI 评分 */}
          {idea.aiScores && (
            <div className={`mt-3 p-3 bg-gray-50 rounded-lg space-y-2 ${expanded ? '' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600">AI 综合评分</span>
                <ScoreBadge score={idea.aiScores.overall} />
              </div>
              {expanded && (
                <>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { label: '用户价值', score: idea.aiScores.userValue, weight: '40%' },
                      { label: '可行性',   score: idea.aiScores.feasibility,    weight: '30%' },
                      { label: '商业价值', score: idea.aiScores.businessValue, weight: '20%' },
                      { label: '趣味性',   score: idea.aiScores.funFactor,      weight: '10%' },
                    ].map(d => (
                      <div key={d.label} className="flex justify-between text-gray-500">
                        <span>{d.label} <span className="text-gray-400">({d.weight})</span></span>
                        <ScoreBadge score={d.score} />
                      </div>
                    ))}
                  </div>
                  {idea.aiFeedback && (
                    <p className="text-xs text-gray-600 border-t border-gray-200 pt-2 leading-relaxed">
                      💬 {idea.aiFeedback}
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* 人工备注 */}
          {expanded && review?.notes && (
            <div className="mt-2 p-2 bg-yellow-50 rounded text-xs text-yellow-800">
              📝 {review.notes}
            </div>
          )}

          {/* 操作区 */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>{timeAgo(idea.createdAt)}</span>
              {idea.createdByUsername && <span>· {idea.createdByUsername}</span>}
            </div>
            <div className="flex items-center gap-1">
              <button className="btn-ghost text-xs py-1" onClick={() => setExpanded(v => !v)}>
                {expanded ? '收起' : '展开'}
              </button>
              <button className="btn-ghost text-xs py-1 text-indigo-600" onClick={() => onReview(idea)}>
                验证
              </button>
              {review?.status === 'approved' && (
                <button className="btn-ghost text-xs py-1 text-green-600" onClick={() => onConvert(idea)}>
                  → 开发
                </button>
              )}
              <button className="btn-ghost text-xs py-1 text-red-500" onClick={() => onDelete(idea.id)}>
                删除
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ 验证弹窗 ============
function ReviewModal({ idea, onSave, onClose }: {
  idea: Idea;
  onSave: (idea: Idea) => void;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<ReviewStatus>(idea.manualReview?.status || 'pending');
  const [priority, setPriority] = useState<Priority>(idea.manualReview?.priority || 'medium');
  const [notes, setNotes] = useState(idea.manualReview?.notes || '');

  function handleSave() {
    onSave({
      ...idea,
      manualReview: { status, priority, notes, reviewedAt: new Date().toISOString() },
      updatedAt: new Date().toISOString(),
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">人工验证</h2>
        <p className="text-sm text-gray-500 mb-4 truncate">「{idea.title}」</p>

        <div className="space-y-4">
          {/* 决策 */}
          <div>
            <label className="label">最终决策</label>
            <div className="grid grid-cols-4 gap-2">
              {([
                ['pending', '⏳ 待定'],
                ['approved', '✅ 采纳'],
                ['rejected', '❌ 否决'],
                ['archived', '📦 归档'],
              ] as [ReviewStatus, string][]).map(([val, lbl]) => (
                <button
                  key={val}
                  onClick={() => setStatus(val)}
                  className={`py-2 px-1 rounded-lg border text-xs font-medium transition-colors ${
                    status === val
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* 优先级 */}
          <div>
            <label className="label">优先级</label>
            <div className="grid grid-cols-4 gap-2">
              {([
                ['low', '低'],
                ['medium', '中'],
                ['high', '高'],
                ['critical', '紧急'],
              ] as [Priority, string][]).map(([val, lbl]) => (
                <button
                  key={val}
                  onClick={() => setPriority(val)}
                  className={`py-2 rounded-lg border text-xs font-medium transition-colors ${
                    priority === val
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* 备注 */}
          <div>
            <label className="label">备注意见（可选）</label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="记录你的判断依据..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2 mt-5 justify-end">
          <button className="btn-secondary" onClick={onClose}>取消</button>
          <button className="btn-primary" onClick={handleSave}>保存</button>
        </div>
      </div>
    </div>
  );
}

// ============ 主页面 ============
export default function Phase1Page() {
  const { state, saveIdea, updateIdeaReview, removeIdea, convertIdeaToProject, navigate } = useApp();
  const { profile } = useAuth();
  const { ideas } = state;

  // 表单状态
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState<IdeaCategory>('app');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [scoring, setScoring] = useState(false);
  const [scoreError, setScoreError] = useState('');

  // 筛选
  const [filterCat, setFilterCat] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'time' | 'score'>('time');

  // 验证弹窗
  const [reviewIdea, setReviewIdea] = useState<Idea | null>(null);

  function addTag() {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
    setTagInput('');
  }

  async function handleSubmit() {
    if (!title.trim()) return;
    // 先创建骨架，saveIdea 内部会写 DB 并返回真实 id
    const idea: Idea = {
      id: '__new__',  // 占位，saveIdea 会更新为真实 id
      title: title.trim(),
      description: desc.trim(),
      category,
      customTags: tags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveIdea(idea);  // 写 DB，idea.id 被更新为真实 uuid
    setTitle(''); setDesc(''); setTags([]); setTagInput(''); setScoreError('');

    // 自动 AI 评分（仅创建时触发一次）
    setScoring(true);
    try {
      const { scores, feedback } = await scoreIdea(idea.title, idea.description, idea.category);
      await saveIdea({
        ...idea,
        aiScores: scores,
        aiFeedback: feedback,
        aiScoredAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, true);
    } catch (e: any) {
      setScoreError(e.message || 'AI 评分失败，可稍后手动评分');
    } finally {
      setScoring(false);
    }
  }

  async function handleConvert(idea: Idea) {
    await convertIdeaToProject(idea);
    navigate('phase2');
  }

  // 筛选 & 排序
  const filtered = ideas
    .filter(i => {
      if (filterCat !== 'all' && i.category !== filterCat) return false;
      if (filterStatus !== 'all') {
        if (filterStatus === 'no-review' && i.manualReview) return false;
        if (filterStatus !== 'no-review' && i.manualReview?.status !== filterStatus) return false;
      }
      if (search && !i.title.toLowerCase().includes(search.toLowerCase()) &&
          !i.description.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'score') {
        return (b.aiScores?.overall ?? -1) - (a.aiScores?.overall ?? -1);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">📝 需求收集</h2>
        <p className="text-sm text-gray-500 mt-1">记录创意点子，AI 自动评分，人工筛选决策</p>
      </div>

      {/* 录入表单 */}
      <div className="card p-5 space-y-4">
        <h3 className="font-semibold text-gray-800">添加新点子</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="label">点子标题 *</label>
            <input
              className="input"
              placeholder="用一句话描述你的点子..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
            />
          </div>
          <div className="md:col-span-2">
            <label className="label">详细描述</label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="描述解决什么问题、目标用户是谁、核心功能是什么..."
              value={desc}
              onChange={e => setDesc(e.target.value)}
            />
          </div>
          <div>
            <label className="label">主分类</label>
            <select className="input" value={category} onChange={e => setCategory(e.target.value as IdeaCategory)}>
              {CATEGORIES.map(([val, info]) => (
                <option key={val} value={val}>{info.icon} {info.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">自定义标签</label>
            <div className="flex gap-2">
              <input
                className="input"
                placeholder="输入后按 Enter"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <button className="btn-secondary shrink-0" onClick={addTag}>添加</button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map(t => (
                  <span key={t} className="badge bg-indigo-100 text-indigo-700 cursor-pointer hover:bg-indigo-200"
                    onClick={() => setTags(prev => prev.filter(x => x !== t))}>
                    #{t} ×
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={!title.trim() || scoring}
          >
            {scoring ? '⏳ AI 评分中...' : '📤 提交点子'}
          </button>
          {scoreError && <span className="text-xs text-red-500">{scoreError}</span>}
        </div>
      </div>

      {/* 筛选工具栏 */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          className="input w-48 text-sm"
          placeholder="🔍 搜索点子..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="input w-36 text-sm" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="all">全部分类</option>
          {CATEGORIES.map(([val, info]) => (
            <option key={val} value={val}>{info.icon} {info.label}</option>
          ))}
        </select>
        <select className="input w-36 text-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">全部状态</option>
          <option value="no-review">待验证</option>
          <option value="pending">⏳ 暂存</option>
          <option value="approved">✅ 已采纳</option>
          <option value="rejected">❌ 已否决</option>
          <option value="archived">📦 已归档</option>
        </select>
        <select className="input w-28 text-sm" value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
          <option value="time">最新优先</option>
          <option value="score">评分优先</option>
        </select>
        <span className="text-sm text-gray-400 ml-auto">{filtered.length} / {ideas.length} 条</span>
      </div>

      {/* 点子列表 */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <div className="text-4xl mb-3">💡</div>
          <div className="text-sm">
            {ideas.length === 0 ? '还没有点子，填写上方表单开始记录吧！' : '没有匹配的点子'}
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map(idea => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              onReview={setReviewIdea}
              onDelete={removeIdea}
              onConvert={handleConvert}
            />
          ))}
        </div>
      )}

      {/* 验证弹窗 */}
      {reviewIdea && (
        <ReviewModal
          idea={reviewIdea}
          onSave={async (updated) => {
            if (!profile) return;
            await updateIdeaReview(
              updated.id,
              updated.manualReview?.status || 'pending',
              updated.manualReview?.priority || 'medium',
              updated.manualReview?.notes || '',
              profile.id,
            );
          }}
          onClose={() => setReviewIdea(null)}
        />
      )}
    </div>
  );
}
