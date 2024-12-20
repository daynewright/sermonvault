import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

type UserData = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
};

export function useUser() {
  const supabase = createClientComponentClient();
  const [userData, setUserData] = useState<UserData>({
    user: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;

        setUserData({
          user,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        setUserData({
          user: null,
          isLoading: false,
          error: error instanceof Error ? error : new Error('Failed to fetch user'),
        });
      }
    };

    // Initial fetch
    fetchUser();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUserData(prev => ({
          ...prev,
          user: session?.user ?? null,
          isLoading: false,
        }));
      }
    );

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  return userData;
} 