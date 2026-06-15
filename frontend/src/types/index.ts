// ============ 核心实体类型 ============

export type IdeaCategory =
  | 'app' | 'web' | 'mini-program' | 'agent'
  | 'tool' | 'content' | 'hardware' | 'other';

export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'archived';
export type Priority = 'low' | 'medium' | 'high' | 'critical';

export interface AIScores {
  userValue: number;      // 用户价值 0-10 (权重40%)
  feasibility: number;    // 可行性 0-10 (权重30%)
  businessValue: number;  // 商业价值 0-10 (权重20%)
  funFactor: number;      // 趣味性 0-10 (权重10%)
  overall: number;        // 加权总分
}

export interface Idea {
  id: string;
  title: string;
  description: string;
  category: IdeaCategory;
  customTags: string[];
  aiScores?: AIScores;
  aiFeedback?: string;
  aiScoredAt?: string;
  manualReview?: {
    status: ReviewStatus;
    priority: Priority;
    notes: string;
    reviewedAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

// ============ 项目（第二阶段）============

export type ProjectStatus =
  | 'planning' | 'in-progress' | 'testing' | 'completed' | 'paused' | 'cancelled';

export type PhaseStatus = 'pending' | 'in-progress' | 'completed';

export interface ProjectPhase {
  id: string;
  name: string;
  description: string;
  status: PhaseStatus;
  included: boolean;   // 是否纳入该项目（勾选的阶段才计算进度）
  isFixed?: boolean;   // 固定阶段（测试/发布），不可取消勾选
  estimatedHours?: number;
  actualHours?: number;
  startedAt?: string;
  completedAt?: string;
}

export interface Project {
  id: string;
  ideaId?: string;        // 关联的点子ID（可选，支持直接创建）
  name: string;
  description: string;
  category: IdeaCategory;
  status: ProjectStatus;
  phases: ProjectPhase[];
  techStack: {
    frontend?: string;
    backend?: string;
    database?: string;
    services?: string[];
  };
  progress: number;       // 自动计算
  createdAt: string;
  updatedAt: string;
}

// ============ 产品（第三阶段 GTM）============

export type ProductStatus = 'pre-launch' | 'launched' | 'sunset' | 'failed';

export interface ChecklistItem {
  id: string;
  item: string;
  completed: boolean;
  completedAt?: string;
}

export interface MarketingRecord {
  id: string;
  channel: string;
  content: string;
  url?: string;
  metrics: {
    views?: number;
    clicks?: number;
    conversions?: number;
    cost?: number;
  };
  publishedAt: string;
}

export interface GrowthTemplate {
  id: string;
  name: string;
  description: string;
  isCustom: boolean;
  steps: Array<{
    id: string;
    order: number;
    title: string;
    description: string;
    isFixed: boolean;
  }>;
}

export interface Product {
  id: string;
  projectId?: string;
  name: string;
  description: string;
  category: IdeaCategory;
  status: ProductStatus;
  launchChecklist: ChecklistItem[];
  userMetrics: {
    totalUsers: number;
    dailyActiveUsers?: number;
    retentionRate?: number;
    lastUpdated: string;
  };
  financials: {
    revenue: number;
    costs: number;
    lastUpdated: string;
  };
  marketing: MarketingRecord[];
  growthTemplateId?: string;  // 使用的增长模板
  launchedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ============ 平台统计 ============

export interface PlatformStats {
  ideaCount: number;
  approvedIdeaCount: number;
  projectCount: number;
  activeProjectCount: number;
  productCount: number;
  launchedProductCount: number;
  totalUsers: number;
  recentIdeas: number;
}

// ============ 应用状态 ============

export type PageKey = 'landing' | 'phase1' | 'phase2' | 'phase3';

export interface AppState {
  currentPage: PageKey;
  ideas: Idea[];
  projects: Project[];
  products: Product[];
  growthTemplates: GrowthTemplate[];
  stats: PlatformStats;
  loading: boolean;
}

export type AppAction =
  | { type: 'SET_PAGE'; payload: PageKey }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'LOAD_ALL'; payload: Omit<AppState, 'currentPage' | 'loading' | 'stats'> }
  | { type: 'ADD_IDEA'; payload: Idea }
  | { type: 'UPDATE_IDEA'; payload: Idea }
  | { type: 'DELETE_IDEA'; payload: string }
  | { type: 'ADD_PROJECT'; payload: Project }
  | { type: 'UPDATE_PROJECT'; payload: Project }
  | { type: 'DELETE_PROJECT'; payload: string }
  | { type: 'ADD_PRODUCT'; payload: Product }
  | { type: 'UPDATE_PRODUCT'; payload: Product }
  | { type: 'DELETE_PRODUCT'; payload: string }
  | { type: 'ADD_GROWTH_TEMPLATE'; payload: GrowthTemplate }
  | { type: 'UPDATE_GROWTH_TEMPLATE'; payload: GrowthTemplate }
  | { type: 'DELETE_GROWTH_TEMPLATE'; payload: string };
