# 整体架构设计

## 版本
v1.0 - 2026-06-11

## 技术栈
- **前端框架**：React 18 + TypeScript
- **构建工具**：Vite
- **样式方案**：Tailwind CSS（推荐）或 CSS Modules
- **状态管理**：React Context + useReducer（轻量级）
- **数据存储**：IndexedDB（通过 idb 库）
- **AI集成**：DeepSeek API（通过 fetch 调用）
- **路由管理**：客户端路由（无后端路由）

## 页面结构

### 单页应用布局
```
<App>
  ├── <Header>（平台标题）
  ├── <Navigation>（顶部导航栏）
  │   ├── [📝 需求收集]
  │   ├── [🛠️ 需求开发]
  │   └── [🚀 GTM]
  ├── <MainContent>（根据导航切换）
  │   ├── 场景1: <LandingPage>（引导页面）
  │   ├── 场景2: <Phase1Page>（需求收集）
  │   ├── 场景3: <Phase2Page>（需求开发）
  │   └── 场景4: <Phase3Page>（GTM）
  └── <Footer>（版本信息）
```

### 导航逻辑
- 首次访问：显示 `<LandingPage>`（引导页面）
- 点击导航：切换到对应页面，更新URL hash（如 `#phase1`）
- 刷新页面：根据URL hash恢复对应页面
- 默认hash：`#landing`（引导页面）

## 数据模型

### 核心实体
```typescript
// 点子（第一阶段）
interface Idea {
  id: string;
  title: string;
  description: string;
  category: 'app' | 'web' | 'mini-program' | 'agent' | 'tool' | 'content' | 'hardware' | 'other';
  customTags: string[];
  aiScores: {
    userValue: number;    // 用户价值 0-10
    feasibility: number;  // 可行性 0-10
    businessValue: number;// 商业价值 0-10
    funFactor: number;    // 趣味性 0-10
    overall: number;      // 加权总分
  };
  aiFeedback: string;     // AI评语
  manualReview?: {
    status: 'pending' | 'approved' | 'rejected' | 'archived';
    priority: 'low' | 'medium' | 'high' | 'critical';
    notes: string;
    reviewedAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

// 项目（第二阶段）
interface Project {
  id: string;
  ideaId: string;         // 关联的点子ID
  name: string;
  description: string;
  category: Idea['category'];
  status: 'planning' | 'in-progress' | 'testing' | 'completed' | 'paused' | 'cancelled';
  
  // 任务分解（粗粒度）
  phases: Array<{
    id: string;
    name: string;
    description: string;
    status: 'pending' | 'in-progress' | 'completed';
    estimatedHours?: number;
    actualHours?: number;
    startedAt?: Date;
    completedAt?: Date;
  }>;
  
  // 技术栈推荐（简化描述）
  techStack: {
    frontend: string;
    backend?: string;
    database?: string;
    services?: string[];
  };
  
  progress: number;       // 自动计算：完成阶段数 / 总阶段数
  createdAt: Date;
  updatedAt: Date;
}

// 产品（第三阶段）
interface Product {
  id: string;
  projectId: string;      // 关联的项目ID
  name: string;
  description: string;
  status: 'pre-launch' | 'launched' | 'sunset' | 'failed';
  
  // 上线准备
  launchChecklist: Array<{
    item: string;
    completed: boolean;
    completedAt?: Date;
  }>;
  
  // 用户数据
  userMetrics: {
    totalUsers: number;
    dailyActiveUsers?: number;
    retentionRate?: number;  // 百分比
    lastUpdated: Date;
  };
  
  // 财务数据
  financials: {
    revenue: number;      // 总收入（元）
    costs: number;        // 总成本（元）
    profit: number;       // 利润（自动计算）
    roi?: number;         // 投资回报率（百分比）
    lastUpdated: Date;
  };
  
  // 市场推广
  marketing: Array<{
    channel: '小红书' | '知乎' | '公众号' | '抖音' | '其他';
    content: string;
    url?: string;
    metrics: {
      views?: number;
      clicks?: number;
      conversions?: number;
      cost?: number;
    };
    publishedAt: Date;
  }>;
  
  // 复盘记录
  retrospectives: Array<{
    type: 'success' | 'failure' | 'lesson';
    title: string;
    content: string;
    createdAt: Date;
  }>;
  
  launchedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### 统计汇总数据
```typescript
interface PlatformStats {
  // 项目分布
  ideaCount: number;
  projectCount: number;
  productCount: number;
  
  // 按分类统计
  byCategory: Record<Idea['category'], {
    ideas: number;
    projects: number;
    products: number;
  }>;
  
  // 用户总数（所有产品的用户之和）
  totalUsers: number;
  
  // 近期活动
  recentIdeas: number;    // 最近7天新增点子
  activeProjects: number; // 进行中的项目
  
  lastUpdated: Date;
}
```

## 组件结构

### 核心组件
```
src/
├── components/
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Navigation.tsx
│   │   └── Footer.tsx
│   ├── pages/
│   │   ├── LandingPage.tsx      # 引导页面
│   │   ├── Phase1Page.tsx       # 需求收集
│   │   ├── Phase2Page.tsx       # 需求开发
│   │   └── Phase3Page.tsx       # GTM
│   └── shared/
│       ├── IdeaCard.tsx         # 点子卡片
│       ├── ProjectCard.tsx      # 项目卡片
│       ├── ProductCard.tsx      # 产品卡片
│       └── StatsCard.tsx        # 统计卡片
├── hooks/
│   ├── useDataStore.ts          # IndexedDB操作
│   ├── useAIScoring.ts          # AI评分
│   └── usePlatformStats.ts      # 统计计算
├── utils/
│   ├── database.ts              # IndexedDB初始化
│   ├── aiScoring.ts             # AI评分逻辑
│   └── calculations.ts          # 进度计算等
└── types/
    └── index.ts                 # TypeScript类型定义
```

## 状态管理

### 应用状态
```typescript
interface AppState {
  // 当前页面
  currentPage: 'landing' | 'phase1' | 'phase2' | 'phase3';
  
  // 数据加载状态
  loading: boolean;
  
  // 核心数据
  ideas: Idea[];
  projects: Project[];
  products: Product[];
  
  // 统计信息
  stats: PlatformStats;
  
  // UI状态
  filters: {
    category?: Idea['category'];
    status?: string;
    searchText?: string;
  };
}
```

### 数据流
```
用户操作 → 组件事件 → useReducer更新状态 → 组件重渲染
                    ↓
                IndexedDB持久化
```

## 关键功能实现

### 1. 导航切换
```typescript
// Navigation.tsx
const Navigation = () => {
  const [currentPage, setCurrentPage] = useAppState();
  
  const pages = [
    { id: 'landing', label: '🏠 概览' },
    { id: 'phase1', label: '📝 需求收集' },
    { id: 'phase2', label: '🛠️ 需求开发' },
    { id: 'phase3', label: '🚀 GTM' },
  ];
  
  return (
    <nav>
      {pages.map(page => (
        <button
          key={page.id}
          className={currentPage === page.id ? 'active' : ''}
          onClick={() => setCurrentPage(page.id)}
        >
          {page.label}
        </button>
      ))}
    </nav>
  );
};
```

### 2. 引导页面（LandingPage）
```typescript
// LandingPage.tsx
const LandingPage = () => {
  const { stats } = useAppState();
  
  return (
    <div>
      <h1>🎯 01计划 - 产品孵化平台</h1>
      <p>目标：打造100个产品，相信其中有一次会成功</p>
      
      <div className="stats-grid">
        <StatsCard title="📝 点子池" value={stats.ideaCount} />
        <StatsCard title="🛠️ 进行中" value={stats.activeProjects} />
        <StatsCard title="🚀 已上线" value={stats.productCount} />
        <StatsCard title="👥 累计用户" value={stats.totalUsers} />
      </div>
      
      <div className="quick-actions">
        <button onClick={() => navigateTo('phase1')}>💡 添加新点子</button>
        <button onClick={() => navigateTo('phase2')}>🔄 查看开发项目</button>
        <button onClick={() => navigateTo('phase3')}>📈 管理产品数据</button>
      </div>
    </div>
  );
};
```

### 3. 数据持久化（IndexedDB）
```typescript
// utils/database.ts
class DataStore {
  private db: IDBDatabase;
  
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('01plan-db', 1);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // 创建对象存储
        if (!db.objectStoreNames.contains('ideas')) {
          const store = db.createObjectStore('ideas', { keyPath: 'id' });
          store.createIndex('category', 'category', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
        
        // 类似创建 projects, products 存储
      };
      
      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };
      
      request.onerror = reject;
    });
  }
  
  async addIdea(idea: Idea) {
    return this.addItem('ideas', idea);
  }
  
  async getAllIdeas(): Promise<Idea[]> {
    return this.getAllItems('ideas');
  }
  
  // 其他CRUD操作...
}
```

### 4. AI评分集成
```typescript
// utils/aiScoring.ts
async function scoreIdeaWithAI(idea: Partial<Idea>): Promise<Idea['aiScores']> {
  const prompt = `请评估以下产品点子的潜力：
  点子标题：${idea.title}
  点子描述：${idea.description}
  分类：${idea.category}
  
  请从以下四个维度评分（0-10分）：
  1. 用户价值：解决用户真实需求的程度
  2. 可行性：技术实现和资源需求的难度
  3. 商业价值：盈利潜力和市场规模
  4. 趣味性：创新性和有趣程度
  
  权重：用户价值(40%) > 可行性(30%) > 商业价值(20%) > 趣味性(10%)
  
  请返回JSON格式：
  {
    "userValue": 分数,
    "feasibility": 分数,
    "businessValue": 分数,
    "funFactor": 分数,
    "overall": 加权总分,
    "feedback": "一段详细的评语和建议"
  }`;
  
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    }),
  });
  
  const data = await response.json();
  const content = data.choices[0].message.content;
  
  // 解析JSON响应
  return JSON.parse(content);
}
```

## 开发优先级

### 第一轮：基础骨架（1-2天）
1. 创建React项目，设置TypeScript和Vite
2. 实现基本布局（Header, Navigation, Footer）
3. 实现LandingPage（静态数据）
4. 设置IndexedDB基础结构

### 第二轮：第一阶段功能（2-3天）
1. 实现Phase1Page：点子录入表单
2. 集成AI评分（DeepSeek API）
3. 实现点子列表和筛选
4. 添加人工验证功能

### 第三轮：第二阶段功能（2-3天）
1. 实现Phase2Page：项目看板
2. 实现任务分解和进度跟踪
3. 添加技术栈推荐功能
4. 实现"一键转换"（点子→项目）

### 第四轮：第三阶段功能（2-3天）
1. 实现Phase3Page：产品管理
2. 添加上线检查表
3. 实现用户增长和盈利跟踪
4. 添加市场推广记录

### 第五轮：优化和部署（1-2天）
1. 样式优化和响应式设计
2. 数据导入/导出功能
3. 部署到EdgeOne Pages
4. 文档编写

## 待确认事项

### 技术细节
1. **Tailwind CSS**是否适用？还是使用其他CSS方案？
2. **IndexedDB库选择**：使用原生API还是idb库？
3. **API密钥管理**：如何安全存储DeepSeek API密钥？

### 功能细节
1. **数据导出格式**：JSON、CSV还是其他？
2. **备份策略**：自动备份到本地文件？
3. **多语言支持**：是否需要英文界面？

### 用户体验
1. **加载状态**：数据加载时的骨架屏设计
2. **错误处理**：网络错误、API失败的处理
3. **离线支持**：是否支持完全离线使用？

## 后续步骤
1. 确认上述架构设计
2. 开始第一轮开发（基础骨架）
3. 并行细化第三阶段需求
4. 定期review进度，调整计划