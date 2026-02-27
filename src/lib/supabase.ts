import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Singleton pattern: reuse connection across app lifecycle
let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
      global: {
        // Enable connection pooling and optimize network requests
        headers: {
          'X-Client-Info': 'supabase-js/web',
        },
      },
    });

    // Listen for auth state changes and cache the session
    if (typeof window !== 'undefined') {
      supabaseInstance.auth.onAuthStateChange((event, session) => {
        // Refresh token 5 minutes before expiry (proactive refresh)
        if (session?.expires_at) {
          const expiresIn = (session.expires_at * 1000) - Date.now();
          const refreshThreshold = 5 * 60 * 1000; // 5 minutes

          if (expiresIn > 0 && expiresIn < refreshThreshold) {
            supabaseInstance?.auth.refreshSession().catch(err => {
              console.warn('Token refresh failed:', err.message);
            });
          }
        }
      });
    }
  }

  return supabaseInstance;
}

// Default export for backward compatibility
export const supabase = getSupabaseClient();
