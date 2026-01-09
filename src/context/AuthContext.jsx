import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { upsertUserProfile, getUserProfile } from "../lib/api/users";
import UsernameOnboarding from "../components/UsernameOnboarding";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [needsUsername, setNeedsUsername] = useState(false);
  const [loading, setLoading] = useState(true); // Track auth initialization

  useEffect(() => {
    // If Supabase isn't configured, skip auth wiring (dev-friendly)
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    // load initial session
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!mounted) return;
        const sessionUser = data.session?.user ?? null;
        setUser(sessionUser);
        
        // Load user profile if session exists
        if (sessionUser) {
          try {
            const profile = await getUserProfile(sessionUser.id);
            console.log('📥 Loaded user profile from session:', profile);
            setUserProfile(profile);
          } catch (error) {
            console.error('Failed to load user profile:', error);
          }
        }
        setLoading(false); // Done loading
      })
      .catch(() => {
        setLoading(false); // Done loading even on error
      });

    // listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      const newUser = session?.user ?? null;
      setUser(newUser);
      
      // Sync user to MongoDB when they log in
      if (newUser && _event === 'SIGNED_IN') {
        try {
          // Create/update user profile
          await upsertUserProfile(newUser.id, {
            email: newUser.email,
            avatar_url: newUser.user_metadata?.avatar_url || '',
          });

          // Check if user has a username
          const profile = await getUserProfile(newUser.id);
          setUserProfile(profile);

          if (!profile?.username || profile.username === newUser.email?.split('@')[0]) {
            // Show username onboarding if no custom username set
            setNeedsUsername(true);
          }
        } catch (error) {
          console.error('Failed to sync user to MongoDB:', error);
        }
      } else {
        setUserProfile(null);
        setNeedsUsername(false);
      }
    });

    return () => {
      mounted = false;
      try {
        // unsubscribe if possible
        listener?.subscription?.unsubscribe?.();
      } catch (e) {
        // ignore
      }
    };
  }, []);

  const handleUsernameComplete = (username) => {
    setNeedsUsername(false);
    setUserProfile((prev) => ({ ...prev, username }));
  };

  const refreshUserProfile = async () => {
    if (!user) return;
    try {
      const profile = await getUserProfile(user.id);
      console.log('🔄 Refreshed user profile:', profile);
      setUserProfile(profile);
    } catch (error) {
      console.error('Failed to refresh user profile:', error);
    }
  };

  const value = { 
    user, 
    userProfile,
    loading,
    refreshUserProfile, 
    setUser, 
    supabaseAvailable: !!supabase 
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {needsUsername && user && (
        <UsernameOnboarding user={user} onComplete={handleUsernameComplete} />
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
