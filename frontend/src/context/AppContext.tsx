import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import type {
  AppState, AppAction, PageKey,
  Idea, Project, Product, GrowthTemplate, PlatformStats,
} from '../types';
import * as db from '../utils/database';
import { DEFAULT_GROWTH_TEMPLATES } from '../utils/constants';
import { calcProjectProgress } from '../utils/calculations';

// ============ 统计计算 ============
function computeStats(
  ideas: Idea[],
  projects: Project[],
  products: Product[]
): PlatformStats {
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
    case 'SET_PAGE':
      return { ...state, currentPage: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'LOAD_ALL': {
      const { ideas, projects, products, growthTemplates } = action.payload;
      return {
        ...state,
        ideas,
        projects,
        products,
        growthTemplates,
        stats: computeStats(ideas, projects, products),
        loading: false,
      };
    }
    case 'ADD_IDEA': {
      const ideas = [...state.ideas, action.payload];
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
      const projects = [...state.projects, action.payload];
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
      const products = [...state.products, action.payload];
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
    case 'ADD_GROWTH_TEMPLATE': {
      const growthTemplates = [...state.growthTemplates, action.payload];
      return { ...state, growthTemplates };
    }
    case 'UPDATE_GROWTH_TEMPLATE': {
      const growthTemplates = state.growthTemplates.map(t =>
        t.id === action.payload.id ? action.payload : t
      );
      return { ...state, growthTemplates };
    }
    case 'DELETE_GROWTH_TEMPLATE': {
      const growthTemplates = state.growthTemplates.filter(t => t.id !== action.payload);
      return { ...state, growthTemplates };
    }
    default:
      return state;
  }
}

// ============ 初始状态 ============
const initialState: AppState = {
  currentPage: 'landing',
  ideas: [],
  projects: [],
  products: [],
  growthTemplates: [],
  stats: {
    ideaCount: 0,
    approvedIdeaCount: 0,
    projectCount: 0,
    activeProjectCount: 0,
    productCount: 0,
    launchedProductCount: 0,
    totalUsers: 0,
    recentIdeas: 0,
  },
  loading: true,
};

// ============ Context ============
interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  navigate: (page: PageKey) => void;
  // Convenience helpers
  saveIdea: (idea: Idea) => Promise<void>;
  removeIdea: (id: string) => Promise<void>;
  saveProject: (project: Project) => Promise<void>;
  removeProject: (id: string) => Promise<void>;
  saveProduct: (product: Product) => Promise<void>;
  removeProduct: (id: string) => Promise<void>;
  saveGrowthTemplate: (tmpl: GrowthTemplate) => Promise<void>;
  removeGrowthTemplate: (id: string) => Promise<void>;
  convertIdeaToProject: (idea: Idea) => Promise<Project>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // 初始化加载数据
  useEffect(() => {
    async function load() {
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        const [ideas, projects, products, templates] = await Promise.all([
          db.getAllIdeas(),
          db.getAllProjects(),
          db.getAllProducts(),
          db.getAllGrowthTemplates(),
        ]);

        // 首次使用时写入默认增长模板
        let growthTemplates = templates;
        if (templates.length === 0) {
          for (const t of DEFAULT_GROWTH_TEMPLATES) {
            await db.putGrowthTemplate(t);
          }
          growthTemplates = DEFAULT_GROWTH_TEMPLATES;
        }

        // 重新计算项目进度
        const projectsWithProgress = projects.map(p => ({
          ...p,
          progress: calcProjectProgress(p.phases),
        }));

        dispatch({ type: 'LOAD_ALL', payload: { ideas, projects: projectsWithProgress, products, growthTemplates } });
      } catch (e) {
        console.error('数据加载失败', e);
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }
    load();
  }, []);

  const navigate = useCallback((page: PageKey) => {
    dispatch({ type: 'SET_PAGE', payload: page });
    window.location.hash = page;
  }, []);

  // 监听 hash 变化（浏览器前进/后退）
  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace('#', '') as PageKey;
      const valid: PageKey[] = ['landing', 'phase1', 'phase2', 'phase3'];
      if (valid.includes(hash)) dispatch({ type: 'SET_PAGE', payload: hash });
    };
    window.addEventListener('hashchange', onHashChange);
    onHashChange(); // 初始化时读取
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Idea helpers
  const saveIdea = useCallback(async (idea: Idea) => {
    const exists = state.ideas.find(i => i.id === idea.id);
    await db.addIdea(idea);
    dispatch({ type: exists ? 'UPDATE_IDEA' : 'ADD_IDEA', payload: idea });
  }, [state.ideas]);

  const removeIdea = useCallback(async (id: string) => {
    await db.deleteIdea(id);
    dispatch({ type: 'DELETE_IDEA', payload: id });
  }, []);

  // Project helpers
  const saveProject = useCallback(async (project: Project) => {
    const withProgress = { ...project, progress: calcProjectProgress(project.phases) };
    const exists = state.projects.find(p => p.id === project.id);
    await db.addProject(withProgress);
    dispatch({ type: exists ? 'UPDATE_PROJECT' : 'ADD_PROJECT', payload: withProgress });
  }, [state.projects]);

  const removeProject = useCallback(async (id: string) => {
    await db.deleteProject(id);
    dispatch({ type: 'DELETE_PROJECT', payload: id });
  }, []);

  // Product helpers
  const saveProduct = useCallback(async (product: Product) => {
    const exists = state.products.find(p => p.id === product.id);
    await db.addProduct(product);
    dispatch({ type: exists ? 'UPDATE_PRODUCT' : 'ADD_PRODUCT', payload: product });
  }, [state.products]);

  const removeProduct = useCallback(async (id: string) => {
    await db.deleteProduct(id);
    dispatch({ type: 'DELETE_PRODUCT', payload: id });
  }, []);

  // GrowthTemplate helpers
  const saveGrowthTemplate = useCallback(async (tmpl: GrowthTemplate) => {
    const exists = state.growthTemplates.find(t => t.id === tmpl.id);
    await db.putGrowthTemplate(tmpl);
    dispatch({ type: exists ? 'UPDATE_GROWTH_TEMPLATE' : 'ADD_GROWTH_TEMPLATE', payload: tmpl });
  }, [state.growthTemplates]);

  const removeGrowthTemplate = useCallback(async (id: string) => {
    await db.deleteGrowthTemplate(id);
    dispatch({ type: 'DELETE_GROWTH_TEMPLATE', payload: id });
  }, []);

  // 一键将 Idea 转换为 Project
  const convertIdeaToProject = useCallback(async (idea: Idea): Promise<Project> => {
    const { v4: uuidv4 } = await import('uuid');
    const phases = getDefaultPhases(idea.category, uuidv4);    const project: Project = {
      id: uuidv4(),
      ideaId: idea.id,
      name: idea.title,
      description: idea.description,
      category: idea.category,
      status: 'planning',
      phases,
      techStack: getDefaultTechStack(idea.category),
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveProject(project);
    return project;
  }, [saveProject]);

  return (
    <AppContext.Provider value={{
      state, dispatch, navigate,
      saveIdea, removeIdea,
      saveProject, removeProject,
      saveProduct, removeProduct,
      saveGrowthTemplate, removeGrowthTemplate,
      convertIdeaToProject,
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

// ============ 辅助：默认阶段模板 ============
function getDefaultPhases(category: string, uuid: () => string) {
  const templates: Record<string, string[]> = {
    app:           ['需求分析', 'UI设计', '前端开发', '后端开发', '测试', '发布'],
    web:           ['原型设计', '前端开发', '后端集成', '测试', '部署'],
    'mini-program':['原型设计', '前端开发', '接口联调', '测试', '审核发布'],
    agent:         ['Prompt设计', '功能开发', '测试调优', '集成部署'],
    tool:          ['方案设计', '核心开发', '测试', '文档'],
    content:       ['内容策划', '生产制作', '发布推广', '复盘优化'],
    hardware:      ['方案设计', '原型制作', '测试验证', '量产'],
    other:         ['规划设计', '开发实现', '测试验证', '发布'],
  };
  const names = templates[category] || templates.other;
  return names.map(name => ({
    id: uuid(),
    name,
    description: '',
    status: 'pending' as const,
  }));
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
