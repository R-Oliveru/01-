import { supabase } from '../lib/supabase';
import type {
  DBIdea, DBProject, DBProjectPhase, DBProduct,
  DBChecklistItem, DBMarketingRecord, DBGrowthTemplate, DBProfile, DBInviteCode
} from '../lib/supabase';

// ============ App Settings（AI Key 等全局配置）============

export async function getAppSetting(key: string): Promise<string | null> {
  const { data } = await supabase.from('app_settings').select('value').eq('key', key).maybeSingle();
  return data?.value ?? null;
}

export async function setAppSetting(key: string, value: string, updatedBy: string): Promise<void> {
  await supabase.from('app_settings').upsert({ key, value, updated_by: updatedBy, updated_at: new Date().toISOString() });
}

// ============ 用户 / Auth ============

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getProfile(userId: string): Promise<DBProfile | null> {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
  return data;
}

export async function getAllProfiles(): Promise<DBProfile[]> {
  const { data } = await supabase.from('profiles').select('*').order('created_at');
  return data || [];
}

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUp(email: string, password: string, username: string, inviteCode: string) {
  const code = inviteCode.trim().toUpperCase();

  // 先验证邀请码是否有效（anon 可查）
  const { data: codeRow, error: codeErr } = await supabase
    .from('invite_codes')
    .select('id')
    .eq('code', code)
    .is('used_by', null)
    .maybeSingle();

  if (codeErr) throw new Error('验证邀请码失败，请重试');
  if (!codeRow) throw new Error('邀请码无效或已被使用');

  // 注册，将邀请码写入 metadata，触发器自动标记已使用
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username, invite_code: code },
    },
  });
  if (error) throw error;

  return data;
}

export async function signOut() {
  return supabase.auth.signOut();
}

// ============ 邀请码 ============

export async function createInviteCode(createdBy: string): Promise<string> {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const { error } = await supabase.from('invite_codes').insert({ code, created_by: createdBy });
  if (error) throw error;
  return code;
}

export async function getInviteCodes(): Promise<DBInviteCode[]> {
  const { data } = await supabase
    .from('invite_codes')
    .select('*, profiles!invite_codes_created_by_fkey(username), used_profiles:profiles!invite_codes_used_by_fkey(username)')
    .order('created_at', { ascending: false });
  return data || [];
}

// ============ Ideas ============

export async function getAllIdeas(): Promise<DBIdea[]> {
  const { data, error } = await supabase
    .from('ideas')
    .select('*, profiles!ideas_created_by_fkey(id,username,is_admin), reviewer:profiles!ideas_reviewed_by_fkey(id,username)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createIdea(idea: Omit<DBIdea, 'id' | 'created_at' | 'updated_at' | 'profiles' | 'reviewer'>): Promise<DBIdea> {
  const { data, error } = await supabase.from('ideas').insert(idea).select().single();
  if (error) throw error;
  return data;
}

export async function updateIdea(id: string, updates: Partial<DBIdea>): Promise<DBIdea> {
  const { data, error } = await supabase.from('ideas').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteIdea(id: string): Promise<void> {
  const { error } = await supabase.from('ideas').delete().eq('id', id);
  if (error) throw error;
}

// ============ Projects ============

export async function getAllProjects(): Promise<DBProject[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*, profiles!projects_created_by_fkey(id,username,is_admin), project_phases(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  // 对 phases 按 sort_order 排序
  return (data || []).map(p => ({
    ...p,
    project_phases: (p.project_phases || []).sort((a: DBProjectPhase, b: DBProjectPhase) => a.sort_order - b.sort_order),
  }));
}

export async function createProject(
  project: Omit<DBProject, 'id' | 'created_at' | 'updated_at' | 'profiles' | 'project_phases'>,
  phases: Omit<DBProjectPhase, 'id' | 'project_id' | 'created_at' | 'updated_at' | 'assignee'>[]
): Promise<DBProject> {
  const { data, error } = await supabase.from('projects').insert(project).select().single();
  if (error) throw error;

  if (phases.length > 0) {
    const { error: phaseErr } = await supabase.from('project_phases').insert(
      phases.map(p => ({ ...p, project_id: data.id }))
    );
    if (phaseErr) throw phaseErr;
  }

  return { ...data, project_phases: phases as DBProjectPhase[] };
}

export async function updateProject(id: string, updates: Partial<DBProject>): Promise<void> {
  const { error } = await supabase.from('projects').update(updates).eq('id', id);
  if (error) throw error;
}

export async function updateProjectPhase(phaseId: string, updates: Partial<DBProjectPhase>): Promise<void> {
  const { error } = await supabase.from('project_phases').update(updates).eq('id', phaseId);
  if (error) throw error;
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw error;
}

// ============ Products ============

export async function getAllProducts(): Promise<DBProduct[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, profiles!products_created_by_fkey(id,username,is_admin), product_checklist(*), marketing_records(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(p => ({
    ...p,
    product_checklist: (p.product_checklist || []).sort((a: DBChecklistItem, b: DBChecklistItem) => a.sort_order - b.sort_order),
  }));
}

export async function createProduct(
  product: Omit<DBProduct, 'id' | 'created_at' | 'updated_at' | 'profiles' | 'product_checklist' | 'marketing_records'>,
  checklistItems: string[]
): Promise<DBProduct> {
  const { data, error } = await supabase.from('products').insert(product).select().single();
  if (error) throw error;

  if (checklistItems.length > 0) {
    await supabase.from('product_checklist').insert(
      checklistItems.map((item, i) => ({ product_id: data.id, item, sort_order: i }))
    );
  }

  return data;
}

export async function updateProduct(id: string, updates: Partial<DBProduct>): Promise<void> {
  const { error } = await supabase.from('products').update(updates).eq('id', id);
  if (error) throw error;
}

export async function updateChecklistItem(id: string, completed: boolean): Promise<void> {
  const { error } = await supabase.from('product_checklist')
    .update({ completed, completed_at: completed ? new Date().toISOString() : null })
    .eq('id', id);
  if (error) throw error;
}

export async function addMarketingRecord(
  record: Omit<DBMarketingRecord, 'id' | 'created_at' | 'profiles'>
): Promise<DBMarketingRecord> {
  const { data, error } = await supabase.from('marketing_records').insert(record).select().single();
  if (error) throw error;
  return data;
}

export async function updateMarketingRecord(id: string, updates: Partial<DBMarketingRecord>): Promise<void> {
  const { error } = await supabase.from('marketing_records').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
}

// ============ Growth Templates ============

export async function getAllGrowthTemplates(): Promise<DBGrowthTemplate[]> {
  const { data, error } = await supabase
    .from('growth_templates')
    .select('*, growth_template_steps(*)')
    .order('created_at');
  if (error) throw error;
  return (data || []).map(t => ({
    ...t,
    growth_template_steps: (t.growth_template_steps || []).sort((a: any, b: any) => a.sort_order - b.sort_order),
  }));
}

// ============ AI 评分（直接调用 DeepSeek，key 存 localStorage）============
// 注意：key 由管理员配置后存 supabase，普通用户透明使用
export async function getTeamAIKey(): Promise<string> {
  // 先查 supabase（admin 配置的统一 key，存在 profiles 的扩展字段 or 直接 localStorage 作为 fallback）
  // 简化实现：统一存 localStorage，管理员设置后所有人共享（同一设备）
  // 生产环境建议存 Supabase secrets / Edge Function
  return localStorage.getItem('deepseek_api_key') || '';
}
