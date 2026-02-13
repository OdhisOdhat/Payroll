import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY"
  );
}

// Admin client for server-side operations (with service role)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

// Anon client for client-side operations
export const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

// Helper to verify JWT tokens (handles both Supabase tokens and demo tokens)
export const verifySupabaseToken = async (token: string) => {
  try {
    // Try Supabase token first
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (!error && data.user) {
      return data.user;
    }

    // Fallback: try to decode as demo token (base64 JSON)
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const payload = JSON.parse(decoded);
      
      // Verify it looks like a valid demo token
      if (payload.sub && payload.email && payload.role) {
        return {
          id: payload.sub,
          email: payload.email,
          user_metadata: {
            role: payload.role,
          },
        };
      }
    } catch (e) {
      // Not a valid demo token either
    }

    return null;
  } catch (err) {
    return null;
  }
};

export default supabaseAdmin;
