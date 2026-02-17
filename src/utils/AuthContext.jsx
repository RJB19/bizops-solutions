import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase'; // Your existing supabase client

// Create the AuthContext
const AuthContext = createContext(null);

// AuthProvider component to manage authentication state
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // Stores user object with role
  const [loading, setLoading] = useState(true); // Manages loading state

  useEffect(() => {
    // This function handles the initial session check robustly.
    const checkInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('role, company_id')
            .eq('id', session.user.id)
            .single();
          if (error) throw error;
          setUser({ ...session.user, role: profile.role, company_id: profile.company_id });
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Error checking initial session:", error);
        setUser(null);
      } finally {
        // This is the crucial part that will resolve the initial loading screen.
        setLoading(false);
      }
    };

    checkInitialSession();

    // Set up the listener for subsequent auth changes (e.g., login, logout).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          supabase.from('profiles').select('role, company_id').eq('id', session.user.id).single()
            .then(({ data: profile, error }) => {
              if (error) {
                console.error("Error fetching profile on SIGNED_IN:", error);
                setUser(session.user); // Set user even if profile fetch fails
              } else {
                setUser({ ...session.user, role: profile.role, company_id: profile.company_id });
              }
            });
        } else if (event === 'SIGNED_OUT') {
          setLoading(true); // Indicate that auth state is changing/being re-evaluated
          setUser(null);
          const timer = setTimeout(() => {
            setLoading(false);
          }, 100); // Small delay, e.g., 100ms
          return () => clearTimeout(timer); // Cleanup timeout
        }
      }
    );

    // Clean up the subscription when the component unmounts.
    return () => {
      subscription.unsubscribe();
    };
  }, []); // Empty dependency array means this runs once on mount

  // Provide the user object and loading state to children components
  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to easily access auth context values
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
