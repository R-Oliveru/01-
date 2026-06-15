import type { GrowthTemplate } from '../types';
import { v4 as uuidv4 } from 'uuid';

export const DEFAULT_GROWTH_TEMPLATES: GrowthTemplate[] = [
  {
    id: uuidv4(),
    name: '小红书冷启动',
    description: '适合内容型产品，通过小红书平台获取初始用户',
    isCustom: false,
    steps: [
      { id: uuidv4(), order: 1, title: '账号养号', description: '创建并运营账号，积累基础粉丝', isFixed: true },
      { id: uuidv4(), order: 2, title: '内容规划', description: '制定内容策略，规划发布节奏', isFixed: true },
      { id: uuidv4(), order: 3, title: 'KOL合作', description: '联系垂类KOL进行合作推广', isFixed: true },
      { id: uuidv4(), order: 4, title: '数据复盘', description: '分析数据，优化内容策略', isFixed: true },
    ],
  },
  {
    id: uuidv4(),
    name: 'Geo定位推广',
    description: '适合本地服务/工具，精准触达目标区域用户',
    isCustom: false,
    steps: [
      { id: uuidv4(), order: 1, title: '区域分析', description: '分析目标区域用户特征和需求', isFixed: true },
      { id: uuidv4(), order: 2, title: '本地渠道', description: '对接本地媒体、社群、公众号', isFixed: true },
      { id: uuidv4(), order: 3, title: '地推活动', description: '线下地推活动，直接触达用户', isFixed: true },
      { id: uuidv4(), order: 4, title: '效果评估', description: '统计活动效果，计算ROI', isFixed: true },
    ],
  },
  {
    id: uuidv4(),
    name: '内网社区推广',
    description: '适合B端/内部工具，在内部社区快速建立用户基础',
    isCustom: false,
    steps: [
      { id: uuidv4(), order: 1, title: '内部预热', description: '在小范围内测，收集早期反馈', isFixed: true },
      { id: uuidv4(), order: 2, title: '帖子发布', description: '在内网社区发布介绍帖', isFixed: true },
      { id: uuidv4(), order: 3, title: '同事反馈', description: '收集同事意见，快速迭代', isFixed: true },
      { id: uuidv4(), order: 4, title: '迭代优化', description: '根据反馈持续优化产品', isFixed: true },
    ],
  },
];

export const CATEGORY_MAP: Record<string, { label: string; icon: string; color: string }> = {
  app:           { label: 'App',   icon: '📱', color: 'bg-blue-100 text-blue-700' },
  web:           { label: '网页',  icon: '🌐', color: 'bg-cyan-100 text-cyan-700' },
  'mini-program':{ label: '小程序', icon: '💬', color: 'bg-green-100 text-green-700' },
  agent:         { label: 'Agent', icon: '🤖', color: 'bg-purple-100 text-purple-700' },
  tool:          { label: '工具库', icon: '🔧', color: 'bg-orange-100 text-orange-700' },
  content:       { label: '内容产品', icon: '📝', color: 'bg-pink-100 text-pink-700' },
  hardware:      { label: '硬件',  icon: '🔌', color: 'bg-gray-100 text-gray-700' },
  other:         { label: '其他',  icon: '✨', color: 'bg-yellow-100 text-yellow-700' },
};

export const REVIEW_STATUS_MAP = {
  pending:  { label: '待验证', color: 'bg-yellow-100 text-yellow-700', icon: '⏳' },
  approved: { label: '已采纳', color: 'bg-green-100 text-green-700',  icon: '✅' },
  rejected: { label: '已否决', color: 'bg-red-100 text-red-700',     icon: '❌' },
  archived: { label: '已归档', color: 'bg-gray-100 text-gray-600',   icon: '📦' },
};

export const PROJECT_STATUS_MAP = {
  planning:    { label: '待开始', color: 'bg-gray-100 text-gray-600' },
  'in-progress': { label: '进行中', color: 'bg-blue-100 text-blue-700' },
  testing:     { label: '测试中', color: 'bg-yellow-100 text-yellow-700' },
  completed:   { label: '已完成', color: 'bg-green-100 text-green-700' },
  paused:      { label: '已暂停', color: 'bg-orange-100 text-orange-700' },
  cancelled:   { label: '已取消', color: 'bg-red-100 text-red-700' },
};

export const PRODUCT_STATUS_MAP = {
  'pre-launch': { label: '准备中', color: 'bg-yellow-100 text-yellow-700', icon: '🔧' },
  launched:     { label: '已上线', color: 'bg-green-100 text-green-700',  icon: '🚀' },
  sunset:       { label: '已归档', color: 'bg-gray-100 text-gray-600',    icon: '📦' },
  failed:       { label: '已停止', color: 'bg-red-100 text-red-700',      icon: '❌' },
};
