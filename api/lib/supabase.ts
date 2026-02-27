import "dotenv/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Read Supabase configuration from environment, with safe fallbacks for development.
let supabaseUrl = process.env.SUPABASE_URL as string | undefined;
let supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
let supabaseAnonKey = process.env.SUPABASE_ANON_KEY as string | undefined;

// Development fallback: if .env loading fails for any reason, use known project keys.
// NOTE: These are already present in the local .env file and are ONLY intended
// for local development. Do NOT rely on this in production.
if (!supabaseUrl) {
  supabaseUrl = "https://krihvurwkovrgzuldlwq.supabase.co";
  console.warn("[supabase] Using hardcoded SUPABASE_URL fallback – fix your .env configuration.");
}

if (!supabaseServiceRoleKey) {
  supabaseServiceRoleKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyaWh2dXJ3a292cmd6dWxkbHdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDk3NDQ3OCwiZXhwIjoyMDg2NTUwNDc4fQ.-6HJEf-wBHvlQ41OflaGpfMj6GPpfHoJ5fMUvj5L-Zw";
  console.warn("[supabase] Using hardcoded SUPABASE_SERVICE_ROLE_KEY fallback – fix your .env configuration.");
}

if (!supabaseAnonKey) {
  supabaseAnonKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyaWh2dXJ3a292cmd6dWxkbHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NzQ0NzgsImV4cCI6MjA4NjU1MDQ3OH0.Kvnl6LpZSpmBVYo9DZtEtpw6t6wXzHAEQsbU5M31fGA";
  console.warn("[supabase] Using hardcoded SUPABASE_ANON_KEY fallback – fix your .env configuration.");
}

// Singleton pattern: reuse admin client (expensive to create multiple)
let adminClientInstance: SupabaseClient | null = null;
let anonClientInstance: SupabaseClient | null = null;

// Get singleton admin client
export function getSupabaseAdminClient(): SupabaseClient {
  if (!adminClientInstance) {
    adminClientInstance = createClient(supabaseUrl!, supabaseServiceRoleKey!, {
      auth: {
        autoRefreshToken: false, // Server-side, no auto-refresh needed
      },
      global: {
        headers: {
          'X-Client-Info': 'supabase-js/server',
        },
      },
    });
  }
  return adminClientInstance;
}

// Get singleton anon client
export function getSupabaseAnonClient(): SupabaseClient {
  if (!anonClientInstance) {
    anonClientInstance = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        autoRefreshToken: true,
      },
    });
  }
  return anonClientInstance;
}

// Backward compatibility - default exports
export const supabaseAdmin = getSupabaseAdminClient();
export const supabaseAnon = getSupabaseAnonClient();

// Token verification with caching layer
let tokenCache = new Map<string, { user: any; expiry: number }>();
const TOKEN_CACHE_TTL = 60000; // Cache tokens for 60 seconds

// Helper to verify JWT tokens (handles both Supabase tokens and demo tokens)
export const verifySupabaseToken = async (token: string) => {
  try {
    // Check in-memory cache first
    const cached = tokenCache.get(token);
    if (cached && cached.expiry > Date.now()) {
      return cached.user;
    }

    // Try Supabase token verification
    const admin = getSupabaseAdminClient();
    const { data, error } = await admin.auth.getUser(token);
    
    if (!error && data.user) {
      // Cache the result to reduce Supabase API calls
      tokenCache.set(token, { user: data.user, expiry: Date.now() + TOKEN_CACHE_TTL });
      return data.user;
    }

    // Fallback: try to decode as demo token (base64 JSON)
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const payload = JSON.parse(decoded);
      
      // Verify it looks like a valid demo token
      if (payload.sub && payload.email && payload.role) {
        const user = {
          id: payload.sub,
          email: payload.email,
          user_metadata: {
            role: payload.role,
          },
        };
        tokenCache.set(token, { user, expiry: Date.now() + TOKEN_CACHE_TTL });
        return user;
      }
    } catch (e) {
      // Not a valid demo token either
    }

    return null;
  } catch (err) {
    console.warn('Token verification error:', err);
    return null;
  }
};

// Cleanup old tokens from cache periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, cached] of tokenCache.entries()) {
    if (cached.expiry < now) {
      tokenCache.delete(token);
    }
  }
}, 300000); // Cleanup every 5 minutes

export default getSupabaseAdminClient();
