'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/store/client';
import { hashPassword } from '@/lib/management-session';

export interface Role {
  id:            string;
  name:          string;
  label:         string;
  allowed_paths: string[];
  created_at:    string;
  user_count?:   number;
}

export interface MgmtUser {
  id:           string;
  username:     string;
  display_name: string | null;
  active:       boolean;
  created_at:   string;
  last_login:   string | null;
  role_id:      string;
  role_label:   string;
}

export async function getRolesAndUsers(): Promise<{
  roles: Role[];
  users: MgmtUser[];
  tablesMissing: boolean;
}> {
  const sb = createAdminClient();
  const [rolesRes, usersRes] = await Promise.all([
    sb.from('management_roles').select('*').order('created_at'),
    sb.from('management_users')
      .select('id, username, display_name, active, created_at, last_login, role_id, management_roles(label)')
      .order('created_at'),
  ]);

  if (rolesRes.error?.code === '42P01' || usersRes.error?.code === '42P01') {
    return { roles: [], users: [], tablesMissing: true };
  }

  const roles = (rolesRes.data ?? []) as Role[];

  // Count users per role
  const countMap = new Map<string, number>();
  for (const u of usersRes.data ?? []) countMap.set(u.role_id, (countMap.get(u.role_id) ?? 0) + 1);
  roles.forEach(r => { r.user_count = countMap.get(r.id) ?? 0; });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const users: MgmtUser[] = (usersRes.data ?? []).map((u: any) => ({
    id:           u.id,
    username:     u.username,
    display_name: u.display_name,
    active:       u.active,
    created_at:   u.created_at,
    last_login:   u.last_login,
    role_id:      u.role_id,
    role_label:   (Array.isArray(u.management_roles) ? u.management_roles[0] : u.management_roles)?.label ?? '—',
  }));

  return { roles, users, tablesMissing: false };
}

export async function createRole(formData: FormData): Promise<{ error?: string }> {
  const name          = (formData.get('name') as string)?.trim().toLowerCase().replace(/\s+/g, '_');
  const label         = (formData.get('label') as string)?.trim();
  const allowed_paths = formData.getAll('allowed_paths') as string[];

  if (!name || !label) return { error: 'Name and label are required' };
  if (allowed_paths.length === 0) return { error: 'Select at least one page' };

  const { error } = await createAdminClient()
    .from('management_roles')
    .insert({ name, label, allowed_paths });

  if (error) return { error: error.message };
  revalidatePath('/management/admin/credentials');
  return {};
}

export async function deleteRole(id: string): Promise<{ error?: string }> {
  const { data: users } = await createAdminClient()
    .from('management_users')
    .select('id')
    .eq('role_id', id)
    .limit(1);

  if (users && users.length > 0) {
    return { error: 'Cannot delete — reassign or remove users with this role first' };
  }

  const { error } = await createAdminClient()
    .from('management_roles')
    .delete()
    .eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/management/admin/credentials');
  return {};
}

export async function createUser(formData: FormData): Promise<{ error?: string }> {
  const username     = (formData.get('username') as string)?.trim().toLowerCase();
  const display_name = (formData.get('display_name') as string)?.trim() || null;
  const password     = formData.get('password') as string;
  const role_id      = formData.get('role_id') as string;

  if (!username || !password || !role_id) return { error: 'All fields are required' };
  if (password.length < 8) return { error: 'Password must be at least 8 characters' };

  const password_hash = hashPassword(password);

  const { error } = await createAdminClient()
    .from('management_users')
    .insert({ username, display_name, password_hash, role_id, active: true });

  if (error) return { error: error.code === '23505' ? 'Username already taken' : error.message };
  revalidatePath('/management/admin/credentials');
  return {};
}

export async function toggleUser(id: string, active: boolean): Promise<{ error?: string }> {
  const { error } = await createAdminClient()
    .from('management_users')
    .update({ active })
    .eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/management/admin/credentials');
  return {};
}

export async function deleteUser(id: string): Promise<{ error?: string }> {
  const { error } = await createAdminClient()
    .from('management_users')
    .delete()
    .eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/management/admin/credentials');
  return {};
}

export async function resetPassword(id: string, newPassword: string): Promise<{ error?: string }> {
  if (newPassword.length < 8) return { error: 'Password must be at least 8 characters' };
  const password_hash = hashPassword(newPassword);
  const { error } = await createAdminClient()
    .from('management_users')
    .update({ password_hash })
    .eq('id', id);

  if (error) return { error: error.message };
  return {};
}
