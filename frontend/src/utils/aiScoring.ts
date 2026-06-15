import type { AIScores } from '../types';
import { calcWeightedScore } from './calculations';
import { getAppSetting } from './api';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

// 从 Supabase 读取团队共享 Key（管理员统一配置）
export async function getAPIKey(): Promise<string> {
  const dbKey = await getAppSetting('deepseek_api_key');
  return dbKey || '';
}

// 管理员保存时写入 Supabase（由 AdminPanel 调用）
export { setAppSetting as saveAPIKeyToDb } from './api';

// 兼容旧的同步读取（Footer 显示用）
export function getLocalAPIKey(): string {
  return localStorage.getItem('deepseek_api_key_cache') || '';
}

export async function scoreIdea(
  title: string,
  description: string,
  category: string
): Promise<{ scores: AIScores; feedback: string }> {
  const apiKey = await getAPIKey();
  if (!apiKey) throw new Error('管理员尚未配置 DeepSeek API Key，请联系管理员');

  const prompt = `你是一位经验丰富的产品评审专家，请评估以下产品点子的潜力：

**点子标题**：${title}
**点子描述**：${description}
**产品类型**：${category}

请从四个维度打分（每项 1-10 分，10 分最高），并给出简短评语。

评分维度：
1. **用户价值**（权重40%）：是否解决真实用户痛点，有多少人需要
2. **可行性**（权重30%）：技术实现难度、资源需求
3. **商业价值**（权重20%）：盈利潜力和市场规模
4. **趣味性**（权重10%）：创新性和趣味程度

请严格按以下 JSON 格式返回，不要有其他文字：
{
  "userValue": 数字,
  "feasibility": 数字,
  "businessValue": 数字,
  "funFactor": 数字,
  "feedback": "简短评语（100-200字）"
}`;

  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as any)?.error?.message || `API 请求失败 (${response.status})`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('AI 返回内容为空');

  const parsed = JSON.parse(content);
  const scores: AIScores = {
    userValue: Number(parsed.userValue),
    feasibility: Number(parsed.feasibility),
    businessValue: Number(parsed.businessValue),
    funFactor: Number(parsed.funFactor),
    overall: calcWeightedScore({
      userValue: Number(parsed.userValue),
      feasibility: Number(parsed.feasibility),
      businessValue: Number(parsed.businessValue),
      funFactor: Number(parsed.funFactor),
    }),
  };

  return { scores, feedback: parsed.feedback || '' };
}
