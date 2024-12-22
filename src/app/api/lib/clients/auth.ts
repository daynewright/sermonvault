import { createServerSupabaseClient } from './supabase';
import { NextResponse } from 'next/server';

export async function getAuthenticatedUser() {
  const supabase = createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    throw new Error('Unauthorized');
  }
  
  return { user, supabase };
}

export async function withAuth<T>(
  handler: (user: any, supabase: any) => Promise<T>
) {
  try {
    const { user, supabase } = await getAuthenticatedUser();
    return await handler(user, supabase);
  } catch (error) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
} 