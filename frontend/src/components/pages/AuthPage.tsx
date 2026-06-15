import { useState } from 'react';
import { signIn, signUp } from '../../utils/api';

type Mode = 'login' | 'register';

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) throw error;
      } else {
        const data = await signUp(email, password, username, inviteCode);
        // 如果 Supabase 要求邮件确认，session 为 null
        if (!data.session) {
          setError('注册成功！请检查邮箱确认后再登录。（如未收到邮件，请检查垃圾箱）');
          setLoading(false);
          return;
        }
      }
    } catch (e: any) {
      setError(e?.message || e?.error_description || JSON.stringify(e) || '操作失败，请重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎯</div>
          <h1 className="text-2xl font-bold text-gray-900">01计划</h1>
          <p className="text-gray-500 text-sm mt-1">产品孵化平台 · 打造 100 个产品</p>
        </div>

        <div className="card p-8">
          {/* Tab 切换 */}
          <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
            {(['login', 'register'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); }}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                  mode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {m === 'login' ? '登录' : '注册'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="label">用户名</label>
                <input
                  className="input"
                  placeholder="你的昵称"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                />
              </div>
            )}

            <div>
              <label className="label">邮箱</label>
              <input
                type="email"
                className="input"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">密码</label>
              <input
                type="password"
                className="input"
                placeholder={mode === 'register' ? '至少 6 位' : '••••••••'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {mode === 'register' && (
              <div>
                <label className="label">邀请码</label>
                <input
                  className="input uppercase tracking-widest"
                  placeholder="XXXXXX"
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value.toUpperCase())}
                  required
                  maxLength={6}
                />
                <p className="text-xs text-gray-400 mt-1">请联系管理员获取邀请码</p>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full py-2.5 justify-center"
              disabled={loading}
            >
              {loading ? '处理中...' : mode === 'login' ? '登录' : '注册'}
            </button>
          </form>

          {mode === 'login' && (
            <p className="text-center text-xs text-gray-400 mt-4">
              没有账号？先联系管理员获取邀请码，再{' '}
              <button className="text-indigo-600 hover:underline" onClick={() => setMode('register')}>注册</button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
