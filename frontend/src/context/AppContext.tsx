import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import type {
  AppState, AppAction, PageKey,
  Idea, Project, Product, GrowthTemplate, PlatformStats, ProjectPhase,
} from '../types';
import * as api from '../utils/api';
import type { DBIdea, DBProject, DBProduct, DBGrowthTemplate } from '../lib/supabase';
import { calcProjectProgress } from '../utils/calculations';
import { useAuth } from './AuthContext';

// ============ DB → App 类型转换 ============

export function dbIdeaToIdea(d: DBIdea): Idea {
  return {
    id: d.id,
    title: d.title,
    description: d.description,
    category: d.category as Idea['category'],
    customTags: d.custom_tags || [],
    aiScores: d.ai_score_overall != null ? {
      userValue: d.ai_score_user_value!,
      feasibility: d.ai_score_feasibility!,
      businessValue: d.ai_score_business_value!,
      funFactor: d.ai_score_fun_factor!,
      overall: d.ai_score_overall!,
    } : undefined,
    aiFeedback: d.ai_feedback,
    aiScoredAt: d.ai_scored_at,
    manualReview: {
      status: d.review_status as any,
      priority: d.review_priority as any,
      notes: d.review_notes,
      reviewedAt: d.reviewed_at || '',
    },
    createdBy: d.created_by,
    createdByUsername: d.profiles?.username,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  };
}

export function dbProjectToProject(d: DBProject): Project {
  const phases: ProjectPhase[] = (d.project_phases || []).map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    status: p.status as ProjectPhase['status'],
    included: p.included,
    isFixed: p.is_fixed,
    assigneeId: p.assignee_id,
    startedAt: p.started_at,
    completedAt: p.completed_at,
  }));
  return {
    id: d.id,
    ideaId: d.idea_id,
    name: d.name,
    description: d.description,
    category: d.category as Project['category'],
    status: d.status as Project['status'],
    phases,
    techStack: d.tech_stack || {},
    progress: calcProjectProgress(phases),
    createdBy: d.created_by,
    createdByUsername: d.profiles?.username,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  };
}

export function dbProductToProduct(d: DBProduct): Product {
  return {
    id: d.id,
    projectId: d.project_id,
    name: d.name,
    description: d.description,
    category: d.category as Product['category'],
    status: d.status as Product['status'],
    launchChecklist: (d.product_checklist || []).map(c => ({
      id: c.id,
      item: c.item,
      completed: c.completed,
      completedAt: c.completed_at,
    })),
    userMetrics: {
      totalUsers: d.total_users,
      dailyActiveUsers: d.daily_active_users,
      retentionRate: d.retention_rate,
      lastUpdated: d.user_metrics_updated_at || d.updated_at,
    },
    financials: {
      revenue: Number(d.revenue),
      costs: Number(d.costs),
      lastUpdated: d.financials_updated_at || d.updated_at,
    },
    marketing: (d.marketing_records || []).map(m => ({
      id: m.id,
      channel: m.channel,
      content: m.content,
      url: m.url,
      metrics: { views: m.views, clicks: m.clicks, conversions: m.conversions, cost: m.cost },
      publishedAt: m.published_at,
      createdBy: m.created_by,
      createdByUsername: m.profiles?.username,
    })),
    launchedAt: d.launched_at,
    createdBy: d.created_by,
    createdByUsername: d.profiles?.username,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  };
}

export function dbTemplateToTemplate(d: DBGrowthTemplate): GrowthTemplate {
  return {
    id: d.id,
    name: d.name,
    description: d.description,
    isCustom: d.is_custom,
    steps: (d.growth_template_steps || []).map(s => ({
      id: s.id,
      order: s.sort_order,
      title: s.title,
      description: s.description,
      isFixed: s.is_fixed,
    })),
  };
}

// ============ 统计计算 ============
function computeStats(ideas: Idea[], projects: Project[], products: Product[]): PlatformStats {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return {
    ideaCount: ideas.length,
    approvedIdeaCount: ideas.filter(i => i.manualReview?.status === 'approved').length,
    projectCount: projects.length,
    activeProjectCount: projects.filter(p => p.status === 'in-progress').length,
    productCount: products.length,
    launchedProductCount: products.filter(p => p.status === 'launched').length,
    totalUsers: products.reduce((sum, p) => sum + (p.userMetrics?.totalUsers || 0), 0),
    recentIdeas: ideas.filter(i => new Date(i.createdAt).getTime() > sevenDaysAgo).length,
  };
}

// ============ Reducer ============
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_PAGE': return { ...state, currentPage: action.payload };
    case 'SET_LOADING': return { ...state, loading: action.payload };
    case 'LOAD_ALL': {
      const { ideas, projects, products, growthTemplates } = action.payload;
      return { ...state, ideas, projects, products, growthTemplates, stats: computeStats(ideas, projects, products), loading: false };
    }
    case 'ADD_IDEA': {
      const ideas = [action.payload, ...state.ideas];
      return { ...state, ideas, stats: computeStats(ideas, state.projects, state.products) };
    }
    case 'UPDATE_IDEA': {
      const ideas = state.ideas.map(i => i.id === action.payload.id ? action.payload : i);
      return { ...state, ideas, stats: computeStats(ideas, state.projects, state.products) };
    }
    case 'DELETE_IDEA': {
      const ideas = state.ideas.filter(i => i.id !== action.payload);
      return { ...state, ideas, stats: computeStats(ideas, state.projects, state.products) };
    }
    case 'ADD_PROJECT': {
      const projects = [action.payload, ...state.projects];
      return { ...state, projects, stats: computeStats(state.ideas, projects, state.products) };
    }
    case 'UPDATE_PROJECT': {
      const projects = state.projects.map(p => p.id === action.payload.id ? action.payload : p);
      return { ...state, projects, stats: computeStats(state.ideas, projects, state.products) };
    }
    case 'DELETE_PROJECT': {
      const projects = state.projects.filter(p => p.id !== action.payload);
      return { ...state, projects, stats: computeStats(state.ideas, projects, state.products) };
    }
    case 'ADD_PRODUCT': {
      const products = [action.payload, ...state.products];
      return { ...state, products, stats: computeStats(state.ideas, state.projects, products) };
    }
    case 'UPDATE_PRODUCT': {
      const products = state.products.map(p => p.id === action.payload.id ? action.payload : p);
      return { ...state, products, stats: computeStats(state.ideas, state.projects, products) };
    }
    case 'DELETE_PRODUCT': {
      const products = state.products.filter(p => p.id !== action.payload);
      return { ...state, products, stats: computeStats(state.ideas, state.projects, products) };
    }
    case 'ADD_GROWTH_TEMPLATE': return { ...state, growthTemplates: [...state.growthTemplates, action.payload] };
    case 'UPDATE_GROWTH_TEMPLATE': return { ...state, growthTemplates: state.growthTemplates.map(t => t.id === action.payload.id ? action.payload : t) };
    case 'DELETE_GROWTH_TEMPLATE': return { ...state, growthTemplates: state.growthTemplates.filter(t => t.id !== action.payload) };
    default: return state;
  }
}

const initialState: AppState = {
  currentPage: 'landing',
  ideas: [], projects: [], products: [], growthTemplates: [],
  stats: { ideaCount: 0, approvedIdeaCount: 0, projectCount: 0, activeProjectCount: 0, productCount: 0, launchedProductCount: 0, totalUsers: 0, recentIdeas: 0 },
  loading: true,
};

// ============ Context ============
interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  navigate: (page: PageKey) => void;
  reload: () => Promise<void>;
  // Idea
  saveIdea: (idea: Idea, forceUpdate?: boolean) => Promise<void>;
  updateIdeaReview: (ideaId: string, status: string, priority: string, notes: string, reviewedBy: string) => Promise<void>;
  removeIdea: (id: string) => Promise<void>;
  // Project
  createProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Project>;
  saveProject: (project: Project) => Promise<void>;
  removeProject: (id: string) => Promise<void>;
  convertIdeaToProject: (idea: Idea) => Promise<Project>;
  // Product
  saveProduct: (product: Product) => Promise<void>;
  removeProduct: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { user } = useAuth();

  const reload = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const [dbIdeas, dbProjects, dbProducts, dbTemplates] = await Promise.all([
        api.getAllIdeas(),
        api.getAllProjects(),
        api.getAllProducts(),
        api.getAllGrowthTemplates(),
      ]);
      dispatch({
        type: 'LOAD_ALL',
        payload: {
          ideas: dbIdeas.map(dbIdeaToIdea),
          projects: dbProjects.map(dbProjectToProject),
          products: dbProducts.map(dbProductToProduct),
          growthTemplates: dbTemplates.map(dbTemplateToTemplate),
        },
      });
    } catch (e) {
      console.error('数据加载失败', e);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  useEffect(() => {
    if (user) reload();
  }, [user, reload]);

  const navigate = useCallback((page: PageKey) => {
    dispatch({ type: 'SET_PAGE', payload: page });
    window.location.hash = page;
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace('#', '') as PageKey;
      const valid: PageKey[] = ['landing', 'phase1', 'phase2', 'phase3'];
      if (valid.includes(hash)) dispatch({ type: 'SET_PAGE', payload: hash });
    };
    window.addEventListener('hashchange', onHashChange);
    onHashChange();
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // ============ Idea 操作 ============
  const saveIdea = useCallback(async (idea: Idea, forceUpdate = false) => {
    const exists = forceUpdate || state.ideas.some(i => i.id === idea.id);
    if (exists) {
      await api.updateIdea(idea.id, {
        title: idea.title, description: idea.description,
        category: idea.category, custom_tags: idea.customTags,
        ai_score_user_value: idea.aiScores?.userValue,
        ai_score_feasibility: idea.aiScores?.feasibility,
        ai_score_business_value: idea.aiScores?.businessValue,
        ai_score_fun_factor: idea.aiScores?.funFactor,
        ai_score_overall: idea.aiScores?.overall,
        ai_feedback: idea.aiFeedback,
        ai_scored_at: idea.aiScoredAt,
      });
      dispatch({ type: 'UPDATE_IDEA', payload: idea });
    } else {
      const created = await api.createIdea({
        title: idea.title, description: idea.description,
        category: idea.category, custom_tags: idea.customTags,
        review_status: 'pending', review_priority: 'medium', review_notes: '',
        created_by: user!.id,
      });
      dispatch({ type: 'ADD_IDEA', payload: dbIdeaToIdea(created) });
      // 返回新的 id（供 AI 评分后 update 用）
      idea.id = created.id;
    }
  }, [state.ideas, user]);

  const updateIdeaReview = useCallback(async (ideaId: string, status: string, priority: string, notes: string, reviewedBy: string) => {
    await api.updateIdea(ideaId, {
      review_status: status, review_priority: priority, review_notes: notes,
      reviewed_by: reviewedBy, reviewed_at: new Date().toISOString(),
    });
    const updated = state.ideas.find(i => i.id === ideaId);
    if (updated) dispatch({ type: 'UPDATE_IDEA', payload: { ...updated, manualReview: { status: status as any, priority: priority as any, notes, reviewedAt: new Date().toISOString() } } });
  }, [state.ideas]);

  const removeIdea = useCallback(async (id: string) => {
    await api.deleteIdea(id);
    dispatch({ type: 'DELETE_IDEA', payload: id });
  }, []);

  // ============ Project 操作 ============
  const createProject = useCallback(async (projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> => {
    const dbPhases = projectData.phases.map((p, i) => ({
      name: p.name, description: p.description || '',
      status: p.status, included: p.included !== false,
      is_fixed: p.isFixed || false, sort_order: i,
      assignee_id: p.assigneeId,
    }));
    const created = await api.createProject({
      name: projectData.name, description: projectData.description,
      category: projectData.category, status: projectData.status,
      tech_stack: projectData.techStack as Record<string, string>, progress: 0,
      idea_id: projectData.ideaId, created_by: user!.id,
    }, dbPhases);
    const project = dbProjectToProject(created);
    dispatch({ type: 'ADD_PROJECT', payload: project });
    return project;
  }, [user]);

  const saveProject = useCallback(async (project: Project) => {
    const progress = calcProjectProgress(project.phases);
    const withProgress = { ...project, progress };

    // 更新项目基本信息
      await api.updateProject(project.id, {
        name: project.name, description: project.description,
        status: project.status, tech_stack: project.techStack as Record<string, string>,
        progress,
      });

    // 批量更新每个阶段
    await Promise.all(project.phases.map(p =>
      api.updateProjectPhase(p.id, {
        status: p.status, included: p.included !== false,
        assignee_id: p.assigneeId,
        started_at: p.startedAt, completed_at: p.completedAt,
      })
    ));

    dispatch({ type: 'UPDATE_PROJECT', payload: withProgress });

    // 项目完成 → 数据库触发器自动创建 GTM 产品，前端 reload 同步
    if (project.status === 'completed') {
      const prevStatus = state.projects.find(p => p.id === project.id)?.status;
      if (prevStatus !== 'completed') {
        // 稍等数据库触发器执行
        setTimeout(() => reload(), 800);
      }
    }
  }, [state.projects, reload]);

  const removeProject = useCallback(async (id: string) => {
    await api.deleteProject(id);
    dispatch({ type: 'DELETE_PROJECT', payload: id });
  }, []);

  const convertIdeaToProject = useCallback(async (idea: Idea): Promise<Project> => {
    const { getDefaultPhases } = await import('./AppContext');
    const { v4: uuidv4 } = await import('uuid');
    const phases = getDefaultPhases(idea.category, uuidv4);
    return createProject({
      ideaId: idea.id, name: idea.title, description: idea.description,
      category: idea.category, status: 'planning', phases,
      techStack: getDefaultTechStack(idea.category), progress: 0,
      createdBy: user!.id,
    });
  }, [createProject, user]);

  // ============ Product 操作 ============
  const saveProduct = useCallback(async (product: Product) => {
    const exists = state.products.some(p => p.id === product.id);
    if (exists) {
      await api.updateProduct(product.id, {
        name: product.name, description: product.description,
        status: product.status, category: product.category,
        total_users: product.userMetrics.totalUsers,
        daily_active_users: product.userMetrics.dailyActiveUsers,
        retention_rate: product.userMetrics.retentionRate,
        revenue: product.financials.revenue,
        costs: product.financials.costs,
        launched_at: product.launchedAt,
        user_metrics_updated_at: new Date().toISOString(),
        financials_updated_at: new Date().toISOString(),
      });
      // 同步 checklist
      await Promise.all(product.launchChecklist.map(item =>
        api.updateChecklistItem(item.id, item.completed)
      ));
      dispatch({ type: 'UPDATE_PRODUCT', payload: product });
    } else {
      const DEFAULT_CHECKLIST = ['确定最终产品名称', '注册域名/上架应用商店', '完善首页和介绍页', '建立用户反馈渠道', '接入数据分析工具'];
      await api.createProduct({
        project_id: product.projectId, name: product.name,
        description: product.description, category: product.category,
        status: product.status, total_users: 0, revenue: 0, costs: 0,
        launched_at: product.status === 'launched' ? new Date().toISOString() : undefined,
        created_by: user!.id,
      }, DEFAULT_CHECKLIST);
      // reload 拿到完整数据
      await reload();
    }
  }, [state.products, user, reload]);

  const removeProduct = useCallback(async (id: string) => {
    await api.deleteProduct(id);
    dispatch({ type: 'DELETE_PRODUCT', payload: id });
  }, []);

  return (
    <AppContext.Provider value={{
      state, dispatch, navigate, reload,
      saveIdea, updateIdeaReview, removeIdea,
      createProject, saveProject, removeProject, convertIdeaToProject,
      saveProduct, removeProduct,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

// ============ 默认阶段模板（导出供 Phase2Page 使用）============
export function getDefaultPhases(category: string, uuid: () => string) {
  const devStages: Record<string, string[]> = {
    app:            ['需求分析', 'UI设计', '前端开发', '后端开发'],
    web:            ['原型设计', '前端开发', '后端集成'],
    'mini-program': ['原型设计', '前端开发', '接口联调'],
    agent:          ['Prompt设计', '功能开发'],
    tool:           ['方案设计', '核心开发', '文档'],
    content:        ['内容策划', '生产制作', '推广运营'],
    hardware:       ['方案设计', '原型制作', '测试验证'],
    other:          ['规划设计', '开发实现'],
  };
  const names = devStages[category] || devStages.other;
  const devPhases = names.map(name => ({
    id: uuid(), name, description: '', status: 'pending' as const, included: true, isFixed: false,
  }));
  return [
    ...devPhases,
    { id: uuid(), name: '测试', description: '', status: 'pending' as const, included: true, isFixed: true },
    { id: uuid(), name: '发布 & 部署', description: '', status: 'pending' as const, included: true, isFixed: true },
  ];
}

function getDefaultTechStack(category: string) {
  const stacks: Record<string, { frontend?: string; backend?: string; database?: string }> = {
    app:    { frontend: 'React Native / Flutter', backend: 'Node.js', database: 'SQLite' },
    web:    { frontend: 'React + Vite', backend: 'Node.js', database: 'PostgreSQL' },
    'mini-program': { frontend: '微信原生 / Taro', backend: 'Node.js', database: 'MySQL' },
    agent:  { frontend: 'React', backend: 'Python + FastAPI' },
    tool:   { frontend: 'React' },
    content:{ frontend: 'Next.js' },
    other:  { frontend: 'React' },
  };
  return stacks[category] || stacks.other;
}
