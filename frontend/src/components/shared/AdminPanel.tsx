import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { createInviteCode, getInviteCodes, getAllProfiles, getAppSetting, setAppSetting } from '../../utils/api';
import type { DBInviteCode, DBProfile } from '../../lib/supabase';

export default function AdminPanel({ onClose }: { onClose: () => void }) {
  const { profile } = useAuth();
  const [tab, setTab] = useState<'invite' | 'members' | 'ai'>('invite');
  const [codes, setCodes] = useState<DBInviteCode[]>([]);
  const [members, setMembers] = useState<DBProfile[]>([]);
  const [generating, setGenerating] = useState(false);
  const [apiKey, setKey] = useState('');
  const [keySaved, setKeySaved] = useState(false);

  useEffect(() => {
    if (tab === 'invite') loadCodes();
    if (tab === 'members') loadMembers();
    if (tab === 'ai') loadAIKey();
  }, [tab]);

  async function loadAIKey() {
    const k = await getAppSetting('deepseek_api_key');
    if (k) setKey(k);
  }

  async function loadCodes() {
    const data = await getInviteCodes();
    setCodes(data);
  }

  async function loadMembers() {
    const data = await getAllProfiles();
    setMembers(data);
  }

  async function handleGenerate() {
    if (!profile) return;
    setGenerating(true);
    try {
      const code = await createInviteCode(profile.id);
      await loadCodes();
      // 复制到剪贴板
      navigator.clipboard.writeText(code).catch(() => {});
    } finally {
      setGenerating(false);
    }
  }

  async function saveApiKey() {
    if (!profile) return;
    await setAppSetting('deepseek_api_key', apiKey.trim(), profile.id);
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-8" onClick={e => e.stopPropagation()}>
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">⚙️ 管理后台</h2>
          <div className="flex gap-1 mt-4">
            {[
              { id: 'invite', label: '邀请码' },
              { id: 'members', label: '成员列表' },
              { id: 'ai', label: 'AI 配置' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id as any)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  tab === t.id ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* 邀请码管理 */}
          {tab === 'invite' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500">生成邀请码分享给团队成员，每个码只能使用一次</p>
                <button className="btn-primary text-sm" onClick={handleGenerate} disabled={generating}>
                  {generating ? '生成中...' : '+ 生成邀请码'}
                </button>
              </div>
              {codes.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">暂无邀请码</div>
              ) : (
                <div className="space-y-2">
                  {codes.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <code className={`text-base font-mono font-bold tracking-widest ${c.used_by ? 'text-gray-400 line-through' : 'text-indigo-600'}`}>
                        {c.code}
                      </code>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        {c.used_by
                          ? <span className="badge bg-gray-100 text-gray-500">已使用</span>
                          : <span className="badge bg-green-100 text-green-700">未使用</span>
                        }
                        <span>{new Date(c.created_at).toLocaleDateString('zh-CN')}</span>
                        {!c.used_by && (
                          <button
                            className="text-indigo-500 hover:underline"
                            onClick={() => navigator.clipboard.writeText(c.code)}
                          >
                            复制
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 成员列表 */}
          {tab === 'members' && (
            <div className="space-y-2">
              {members.map(m => (
                <div key={m.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-semibold text-sm">
                      {m.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{m.username}</div>
                      <div className="text-xs text-gray-400">{new Date(m.created_at).toLocaleDateString('zh-CN')} 加入</div>
                    </div>
                  </div>
                  {m.is_admin && <span className="badge bg-indigo-100 text-indigo-700">管理员</span>}
                </div>
              ))}
            </div>
          )}

          {/* AI 配置 */}
          {tab === 'ai' && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">
                  配置团队共用的 DeepSeek API Key。Key 存储在本设备浏览器，由管理员统一设置后，团队成员在同一网络环境（或同一浏览器）中使用。
                </p>
                <p className="text-xs text-gray-400 mb-4">
                  💡 AI 评分仅在需求创建时触发一次，不会重复调用。
                </p>
              </div>
              <div>
                <label className="label">DeepSeek API Key</label>
                <input
                  type="password"
                  className="input"
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={e => setKey(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-3">
                <button className="btn-primary" onClick={saveApiKey}>保存</button>
                {keySaved && <span className="text-green-600 text-sm">✓ 已保存</span>}
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                ⚠️ 当前为简化方案，Key 存储在浏览器本地。如需更安全的方案，可将 Key 配置为 Supabase Edge Function 环境变量。
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end p-6 pt-0">
          <button className="btn-secondary" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  );
}
