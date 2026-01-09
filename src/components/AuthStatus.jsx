import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

const IS_DEV = import.meta.env.MODE === "development";

export default function AuthStatus() {
  const { user, supabaseAvailable } = useAuth() || {};

  useEffect(() => {
    if (!IS_DEV) return;

    // Log user info whenever it changes
    console.log("[SnapFit Auth]", { user, supabaseAvailable });
  }, [user, supabaseAvailable]);

  useEffect(() => {
    if (!supabase || !IS_DEV) return;

    // Subscribe to auth state changes and log them
    supabase.auth.getSession().then(({ data }) => {
      console.log("[SnapFit Auth] Initial session:", data.session);
    }).catch((e) => console.error("[SnapFit Auth] getSession error:", e));

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`[SnapFit Auth] Event: ${event}`, session?.user);
    });

    return () => {
      try {
        listener?.subscription?.unsubscribe?.();
      } catch (e) {}
    };
  }, []);

  // Don't render anything
  return null;
}
