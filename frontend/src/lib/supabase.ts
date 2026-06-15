import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============ 数据库类型（与表结构对应）============

export interface DBProfile {
  id: string;
  username: string;
  is_admin: boolean;
  avatar_url?: string;
  created_at: string;
}

export interface DBIdea {
  id: string;
  title: string;
  description: string;
  category: string;
  custom_tags: string[];
  ai_score_user_value?: number;
  ai_score_feasibility?: number;
  ai_score_business_value?: number;
  ai_score_fun_factor?: number;
  ai_score_overall?: number;
  ai_feedback?: string;
  ai_scored_at?: string;
  review_status: string;
  review_priority: string;
  review_notes: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  // joined
  profiles?: DBProfile;
  reviewer?: DBProfile;
}

export interface DBProject {
  id: string;
  idea_id?: string;
  name: string;
  description: string;
  category: string;
  status: string;
  tech_stack: Record<string, string>;
  progress: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  // joined
  profiles?: DBProfile;
  project_phases?: DBProjectPhase[];
}

export interface DBProjectPhase {
  id: string;
  project_id: string;
  name: string;
  description: string;
  status: string;
  included: boolean;
  is_fixed: boolean;
  sort_order: number;
  assignee_id?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  // joined
  assignee?: DBProfile;
}

export interface DBProduct {
  id: string;
  project_id?: string;
  name: string;
  description: string;
  category: string;
  status: string;
  total_users: number;
  daily_active_users?: number;
  retention_rate?: number;
  user_metrics_updated_at?: string;
  revenue: number;
  costs: number;
  financials_updated_at?: string;
  launched_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  // joined
  profiles?: DBProfile;
  product_checklist?: DBChecklistItem[];
  marketing_records?: DBMarketingRecord[];
}

export interface DBChecklistItem {
  id: string;
  product_id: string;
  item: string;
  completed: boolean;
  completed_at?: string;
  sort_order: number;
}

export interface DBMarketingRecord {
  id: string;
  product_id: string;
  channel: string;
  content: string;
  url?: string;
  views?: number;
  clicks?: number;
  conversions?: number;
  cost?: number;
  published_at: string;
  created_by: string;
  created_at: string;
  profiles?: DBProfile;
}

export interface DBGrowthTemplate {
  id: string;
  name: string;
  description: string;
  is_custom: boolean;
  created_by?: string;
  created_at: string;
  growth_template_steps?: DBGrowthTemplateStep[];
}

export interface DBGrowthTemplateStep {
  id: string;
  template_id: string;
  title: string;
  description: string;
  is_fixed: boolean;
  sort_order: number;
}

export interface DBInviteCode {
  id: string;
  code: string;
  created_by?: string;
  used_by?: string;
  used_at?: string;
  created_at: string;
}
