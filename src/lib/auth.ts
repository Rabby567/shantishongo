import { supabase } from "@/integrations/supabase/client";

export type UserRole = 'admin' | 'moderator';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: UserRole | null;
  isApproved: boolean;
}

export async function signUp(email: string, password: string, fullName: string): Promise<{ error: Error | null }> {
  const redirectUrl = `${window.location.origin}/`;
  
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl,
      data: {
        full_name: fullName,
      },
    },
  });
  
  return { error };
}

export async function signIn(email: string, password: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  return { error };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getUserRole(userId: string): Promise<UserRole | null> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();
  
  if (error || !data) return null;
  return data.role as UserRole;
}

export async function isModeratorApproved(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('moderator_approvals')
    .select('status')
    .eq('user_id', userId)
    .maybeSingle();
  
  if (error || !data) return false;
  return data.status === 'approved';
}

export async function requestModeratorApproval(userId: string): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('moderator_approvals')
    .insert({ user_id: userId, status: 'pending' });
  
  return { error: error as Error | null };
}

export async function assignModeratorRole(userId: string): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('user_roles')
    .insert({ user_id: userId, role: 'moderator' });
  
  return { error: error as Error | null };
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;
  
  const role = await getUserRole(user.id);
  const isApproved = role === 'moderator' ? await isModeratorApproved(user.id) : role === 'admin';
  
  // Fetch profile data including avatar
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', user.id)
    .maybeSingle();
  
  return {
    id: user.id,
    email: user.email || '',
    fullName: profile?.full_name || user.user_metadata?.full_name || null,
    avatarUrl: profile?.avatar_url || null,
    role,
    isApproved,
  };
}
