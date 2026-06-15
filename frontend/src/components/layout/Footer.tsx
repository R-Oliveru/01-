import { getAPIKey, setAPIKey } from '../../utils/aiScoring';
import { useState } from 'react';

export default function Footer() {
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keyValue, setKeyValue] = useState(getAPIKey);
  const hasKey = !!getAPIKey();

  function saveKey() {
    setAPIKey(keyValue.trim());
    setShowKeyInput(false);
  }

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 h-9 flex items-center justify-between text-xs text-gray-400">
        <span>01计划 v0.1.0 · 本地存储，数据安全</span>

        <div className="flex items-center gap-3">
          <span>
            {hasKey
              ? <span className="text-green-500">✓ DeepSeek AI 已配置</span>
              : <span className="text-amber-500">⚠ 未配置 AI Key</span>
            }
          </span>
          <button
            className="underline hover:text-indigo-600 transition-colors"
            onClick={() => setShowKeyInput(v => !v)}
          >
            {hasKey ? '修改' : '配置'} API Key
          </button>
        </div>
      </div>

      {showKeyInput && (
        <div className="bg-gray-50 border-t border-gray-100 px-4 py-3 flex items-center gap-3 justify-end">
          <span className="text-xs text-gray-500">DeepSeek API Key：</span>
          <input
            type="password"
            className="input w-72 h-8 text-xs"
            placeholder="sk-..."
            value={keyValue}
            onChange={e => setKeyValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveKey()}
          />
          <button className="btn-primary py-1 h-8 text-xs" onClick={saveKey}>保存</button>
          <button className="btn-secondary py-1 h-8 text-xs" onClick={() => setShowKeyInput(false)}>取消</button>
        </div>
      )}
    </footer>
  );
}
