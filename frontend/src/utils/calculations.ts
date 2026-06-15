import type { AIScores } from '../types';

export function calcWeightedScore(scores: Omit<AIScores, 'overall'>): number {
  return +(
    scores.userValue * 0.4 +
    scores.feasibility * 0.3 +
    scores.businessValue * 0.2 +
    scores.funFactor * 0.1
  ).toFixed(1);
}

export function calcProjectProgress(phases: Array<{ status: string }>): number {
  if (phases.length === 0) return 0;
  const done = phases.filter(p => p.status === 'completed').length;
  return Math.round((done / phases.length) * 100);
}

export function formatNumber(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function formatCurrency(n: number): string {
  if (n >= 10000) return `¥${(n / 10000).toFixed(1)}万`;
  return `¥${n.toLocaleString()}`;
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '刚刚';
  if (m < 60) return `${m}分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}小时前`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}天前`;
  return new Date(dateStr).toLocaleDateString('zh-CN');
}
