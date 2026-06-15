import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useApp } from '../../context/AppContext';
import type { Product, ProductStatus, IdeaCategory, MarketingRecord } from '../../types';
import { CATEGORY_MAP, PRODUCT_STATUS_MAP } from '../../utils/constants';
import { formatNumber, formatCurrency, timeAgo } from '../../utils/calculations';

const STATUS_COLUMNS: ProductStatus[] = ['pre-launch', 'launched', 'sunset'];

const DEFAULT_CHECKLIST = [
  '确定最终产品名称',
  '注册域名/上架应用商店',
  '完善首页和介绍页',
  '建立用户反馈渠道',
  '接入数据分析工具',
];

// ============ 产品卡片 ============
function ProductCard({ product, onClick, onDelete }: {
  product: Product;
  onClick: () => void;
  onDelete: () => void;
}) {
  const cat = CATEGORY_MAP[product.category];
  const statusInfo = PRODUCT_STATUS_MAP[product.status];
  const profit = product.financials.revenue - product.financials.costs;

  return (
    <div className="card p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{cat?.icon}</span>
        <span className="font-semibold text-gray-900 truncate flex-1">{product.name}</span>
        <span className={`badge ${statusInfo.color}`}>{statusInfo.icon} {statusInfo.label}</span>
      </div>
      {product.description && (
        <p className="text-xs text-gray-500 line-clamp-2 mb-3">{product.description}</p>
      )}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-500">用户数</div>
          <div className="text-sm font-semibold text-gray-900">{formatNumber(product.userMetrics.totalUsers)}</div>
        </div>
        <div className="p-2 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-500">收入</div>
          <div className="text-sm font-semibold text-gray-900">{formatCurrency(product.financials.revenue)}</div>
        </div>
        <div className={`p-2 rounded-lg ${profit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className="text-xs text-gray-500">利润</div>
          <div className={`text-sm font-semibold ${profit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
            {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
        <span>{product.launchedAt ? `上线 ${timeAgo(product.launchedAt)}` : '准备中'}</span>
        <button className="text-red-400 hover:text-red-600" onClick={e => { e.stopPropagation(); onDelete(); }}>删除</button>
      </div>
    </div>
  );
}

// ============ 产品详情弹窗 ============
function ProductDetailModal({ product, onSave, onClose }: {
  product: Product;
  onSave: (p: Product) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'basic' | 'market' | 'users' | 'finance'>('basic');
  const [data, setData] = useState(product);

  function updateField(path: string, value: any) {
    setData(prev => {
      const parts = path.split('.');
      const copy = { ...prev } as any;
      let cur = copy;
      for (let i = 0; i < parts.length - 1; i++) {
        cur[parts[i]] = { ...cur[parts[i]] };
        cur = cur[parts[i]];
      }
      cur[parts[parts.length - 1]] = value;
      return copy;
    });
  }

  function toggleChecklist(id: string) {
    setData(prev => ({
      ...prev,
      launchChecklist: prev.launchChecklist.map(item =>
        item.id === id
          ? { ...item, completed: !item.completed, completedAt: !item.completed ? new Date().toISOString() : undefined }
          : item
      ),
    }));
  }

  function addMarketing() {
    const record: MarketingRecord = {
      id: uuidv4(),
      channel: '小红书',
      content: '',
      metrics: {},
      publishedAt: new Date().toISOString(),
    };
    setData(prev => ({ ...prev, marketing: [...prev.marketing, record] }));
  }

  function updateMarketing(id: string, field: string, value: any) {
    setData(prev => ({
      ...prev,
      marketing: prev.marketing.map(m => m.id === id ? { ...m, [field]: value } : m),
    }));
  }

  function handleSave() {
    onSave({
      ...data,
      financials: { ...data.financials, lastUpdated: new Date().toISOString() },
      userMetrics: { ...data.userMetrics, lastUpdated: new Date().toISOString() },
      updatedAt: new Date().toISOString(),
    });
    onClose();
  }

  const TABS = [
    { id: 'basic', label: '基础信息' },
    { id: 'market', label: '市场反馈' },
    { id: 'users', label: '用户数据' },
    { id: 'finance', label: '财务数据' },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-8" onClick={e => e.stopPropagation()}>
        {/* 标题 */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{CATEGORY_MAP[data.category]?.icon}</span>
            <div>
              <input
                className="text-lg font-semibold text-gray-900 bg-transparent outline-none border-b border-transparent focus:border-indigo-400 w-64"
                value={data.name}
                onChange={e => setData(prev => ({ ...prev, name: e.target.value }))}
              />
              <div className="flex items-center gap-2 mt-1">
                <select
                  className="text-xs border border-gray-200 rounded px-1 py-0.5"
                  value={data.status}
                  onChange={e => {
                    const s = e.target.value as ProductStatus;
                    setData(prev => ({
                      ...prev, status: s,
                      launchedAt: s === 'launched' && !prev.launchedAt ? new Date().toISOString() : prev.launchedAt,
                    }));
                  }}
                >
                  {Object.entries(PRODUCT_STATUS_MAP).map(([val, info]) => (
                    <option key={val} value={val}>{info.icon} {info.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  tab === t.id ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 space-y-4 min-h-64">
          {/* 基础信息 */}
          {tab === 'basic' && (
            <>
              <div>
                <label className="label">产品描述</label>
                <textarea className="input resize-none" rows={3} value={data.description}
                  onChange={e => setData(prev => ({ ...prev, description: e.target.value }))} />
              </div>
              <div>
                <label className="label">上线准备清单</label>
                <div className="space-y-2">
                  {data.launchChecklist.map(item => (
                    <div key={item.id} className="flex items-center gap-2 cursor-pointer" onClick={() => toggleChecklist(item.id)}>
                      <span>{item.completed ? '✅' : '⬜'}</span>
                      <span className={`text-sm ${item.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                        {item.item}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* 市场反馈 */}
          {tab === 'market' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="label mb-0">推广记录</label>
                <button className="btn-secondary text-xs py-1" onClick={addMarketing}>+ 添加</button>
              </div>
              {data.marketing.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">还没有推广记录</div>
              ) : (
                <div className="space-y-3">
                  {data.marketing.map(m => (
                    <div key={m.id} className="p-3 border border-gray-200 rounded-lg space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="label text-xs">渠道</label>
                          <select className="input text-sm py-1.5" value={m.channel}
                            onChange={e => updateMarketing(m.id, 'channel', e.target.value)}>
                            {['小红书', '知乎', '公众号', '抖音', 'Twitter', '内网社区', '其他'].map(c => (
                              <option key={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="label text-xs">推广内容</label>
                          <input className="input text-sm py-1.5" value={m.content}
                            onChange={e => updateMarketing(m.id, 'content', e.target.value)}
                            placeholder="文章标题/描述..." />
                        </div>
                      </div>
                      <div>
                        <label className="label text-xs">链接（可选）</label>
                        <input className="input text-sm py-1.5" value={m.url || ''}
                          onChange={e => updateMarketing(m.id, 'url', e.target.value)}
                          placeholder="https://..." />
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {(['views', 'clicks', 'conversions', 'cost'] as const).map(k => (
                          <div key={k}>
                            <label className="label text-xs">{k === 'views' ? '浏览' : k === 'clicks' ? '点击' : k === 'conversions' ? '转化' : '花费(¥)'}</label>
                            <input type="number" className="input text-sm py-1.5"
                              value={m.metrics[k] || ''}
                              onChange={e => updateMarketing(m.id, 'metrics', { ...m.metrics, [k]: Number(e.target.value) })}
                              placeholder="0" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 用户数据 */}
          {tab === 'users' && (
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: '累计用户数', field: 'userMetrics.totalUsers', type: 'number' },
                { label: '日活跃用户', field: 'userMetrics.dailyActiveUsers', type: 'number' },
                { label: '用户留存率 (%)', field: 'userMetrics.retentionRate', type: 'number' },
              ].map(({ label, field, type }) => (
                <div key={field}>
                  <label className="label">{label}</label>
                  <input
                    type={type}
                    className="input"
                    value={(field.split('.').reduce((obj: any, key) => obj?.[key], data)) ?? ''}
                    onChange={e => updateField(field, type === 'number' ? Number(e.target.value) : e.target.value)}
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          )}

          {/* 财务数据 */}
          {tab === 'finance' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">总收入 (¥)</label>
                  <input type="number" className="input" value={data.financials.revenue || ''}
                    onChange={e => updateField('financials.revenue', Number(e.target.value))} placeholder="0" />
                </div>
                <div>
                  <label className="label">总成本 (¥)</label>
                  <input type="number" className="input" value={data.financials.costs || ''}
                    onChange={e => updateField('financials.costs', Number(e.target.value))} placeholder="0" />
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">利润</span>
                    <span className={`ml-2 font-semibold ${data.financials.revenue - data.financials.costs >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(data.financials.revenue - data.financials.costs)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">ROI</span>
                    <span className="ml-2 font-semibold text-gray-900">
                      {data.financials.costs > 0
                        ? `${Math.round(((data.financials.revenue - data.financials.costs) / data.financials.costs) * 100)}%`
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end p-6 pt-4 border-t border-gray-100">
          <button className="btn-secondary" onClick={onClose}>取消</button>
          <button className="btn-primary" onClick={handleSave}>保存</button>
        </div>
      </div>
    </div>
  );
}

// ============ 新建产品弹窗 ============
function CreateProductModal({ onSave, onClose }: { onSave: (p: Product) => void; onClose: () => void }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [cat, setCat] = useState<IdeaCategory>('app');
  const [status, setStatus] = useState<ProductStatus>('pre-launch');

  function handleCreate() {
    if (!name.trim()) return;
    const now = new Date().toISOString();
    onSave({
      id: uuidv4(), name: name.trim(), description: desc.trim(),
      category: cat, status,
      launchChecklist: DEFAULT_CHECKLIST.map(item => ({ id: uuidv4(), item, completed: false })),
      userMetrics: { totalUsers: 0, lastUpdated: now },
      financials: { revenue: 0, costs: 0, lastUpdated: now },
      marketing: [],
      launchedAt: status === 'launched' ? now : undefined,
      createdAt: now, updatedAt: now,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">新建 GTM 产品</h2>
        <div className="space-y-4">
          <div>
            <label className="label">产品名称 *</label>
            <input className="input" placeholder="产品名称..." value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">产品描述</label>
            <textarea className="input resize-none" rows={2} value={desc} onChange={e => setDesc(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">分类</label>
              <select className="input" value={cat} onChange={e => setCat(e.target.value as IdeaCategory)}>
                {Object.entries(CATEGORY_MAP).map(([val, info]) => (
                  <option key={val} value={val}>{info.icon} {info.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">当前状态</label>
              <select className="input" value={status} onChange={e => setStatus(e.target.value as ProductStatus)}>
                {Object.entries(PRODUCT_STATUS_MAP).map(([val, info]) => (
                  <option key={val} value={val}>{info.icon} {info.label}</option>
                ))}
              </select>
            </div>
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

// ============ 增长模板展示 ============
function GrowthTemplateSection() {
  const { state } = useApp();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800">📚 增长方法论库</h3>
        <button className="text-xs text-indigo-600 hover:underline" onClick={() => setExpanded(v => !v)}>
          {expanded ? '收起' : '展开查看'}
        </button>
      </div>
      <p className="text-xs text-gray-500 mb-3">已验证的增长模板，可直接套用到你的产品</p>
      {expanded && (
        <div className="grid md:grid-cols-3 gap-3">
          {state.growthTemplates.map(tmpl => (
            <div key={tmpl.id} className="p-3 border border-gray-200 rounded-lg">
              <div className="font-medium text-sm text-gray-900 mb-1">{tmpl.name}</div>
              <p className="text-xs text-gray-500 mb-2">{tmpl.description}</p>
              <div className="space-y-1">
                {tmpl.steps.map((step: { id: string; order: number; title: string; isFixed: boolean }) => (
                  <div key={step.id} className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="w-4 h-4 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">
                      {step.order}
                    </span>
                    {step.title}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ 主页面 ============
export default function Phase3Page() {
  const { state, saveProduct, removeProduct } = useApp();
  const { products } = state;

  const [showCreate, setShowCreate] = useState(false);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');

  const filtered = products.filter(p => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const grouped: Record<ProductStatus, Product[]> = {
    'pre-launch': [], launched: [], sunset: [], failed: [],
  };
  filtered.forEach(p => grouped[p.status]?.push(p));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">🚀 GTM</h2>
          <p className="text-sm text-gray-500 mt-1">跟踪产品上线、用户增长、盈利情况</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>+ 新建产品</button>
      </div>

      {/* 增长模板 */}
      <GrowthTemplateSection />

      {/* 筛选 */}
      <div className="flex flex-wrap items-center gap-3">
        <input className="input w-48 text-sm" placeholder="🔍 搜索产品..." value={search} onChange={e => setSearch(e.target.value)} />
        <div className="flex gap-1">
          {[['all', '全部'], ...STATUS_COLUMNS.map(s => [s, PRODUCT_STATUS_MAP[s].label])].map(([val, lbl]) => (
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
        <span className="text-sm text-gray-400 ml-auto">{filtered.length} 个产品</span>
      </div>

      {/* 看板 */}
      {products.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <div className="text-4xl mb-3">🚀</div>
          <div className="text-sm mb-4">还没有 GTM 产品</div>
          <button className="btn-primary text-sm" onClick={() => setShowCreate(true)}>添加第一个产品</button>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {STATUS_COLUMNS.map(col => (
            <div key={col} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className={`badge ${PRODUCT_STATUS_MAP[col].color}`}>
                  {PRODUCT_STATUS_MAP[col].icon} {PRODUCT_STATUS_MAP[col].label}
                </span>
                <span className="text-xs text-gray-400">({grouped[col].length})</span>
              </div>
              {grouped[col].map(p => (
                <ProductCard key={p.id} product={p} onClick={() => setDetailProduct(p)} onDelete={() => removeProduct(p.id)} />
              ))}
              {grouped[col].length === 0 && (
                <div className="card p-4 text-center text-gray-300 text-xs border-dashed">暂无产品</div>
              )}
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreateProductModal onSave={saveProduct} onClose={() => setShowCreate(false)} />}
      {detailProduct && (
        <ProductDetailModal product={detailProduct} onSave={saveProduct} onClose={() => setDetailProduct(null)} />
      )}
    </div>
  );
}
