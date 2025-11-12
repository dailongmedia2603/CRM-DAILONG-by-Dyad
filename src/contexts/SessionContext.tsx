import { createContext, useContext, useEffect, useMemo, useState, useCallback, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { QueryClient } from "@tanstack/react-query";
import { showError } from "@/utils/toast";
import { Personnel } from "@/types";

type SessionContextType = {
  session: Session | null;
  user: User | null;
  personnel: Personnel | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextType | null>(null);

export const SessionContextProvider = ({ children, queryClient }: { children: ReactNode, queryClient: QueryClient }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [personnel, setPersonnel] = useState<Personnel | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    navigate("/login");
  }, [navigate, queryClient]);

  useEffect(() => {
    setLoading(true);
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT') {
          queryClient.clear();
        }
        setSession(session);
      }
    );

    return () => {
      authSubscription.unsubscribe();
    };
  }, [queryClient]);

  useEffect(() => {
    const userId = session?.user?.id;
    if (userId) {
      setLoading(true);

      const fetchPersonnel = async () => {
        const { data, error } = await supabase
          .from("personnel")
          .select("*")
          .eq("id", userId)
          .single();
        if (error && error.code !== 'PGRST116') {
          console.error("Error fetching personnel:", error);
          showError("Không thể tải thông tin người dùng.");
        }
        setPersonnel(data as Personnel | null);
        setLoading(false);
      };

      fetchPersonnel();

      const personnelChannel = supabase
        .channel(`personnel-changes-${userId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'personnel', filter: `id=eq.${userId}` },
          () => fetchPersonnel()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(personnelChannel);
      };
    } else {
      setPersonnel(null);
      setLoading(false);
    }
  }, [session?.user?.id]);

  const value = useMemo<SessionContextType>(
    () => ({
      session,
      user: session?.user ?? null,
      personnel,
      loading,
      signOut,
    }),
    [session, personnel, loading, signOut]
  );

  return <SessionContext.Provider value={value}>{!loading && children}</SessionContext.Provider>;
};

export const useSession = () => {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within a SessionContextProvider");
  }
  return ctx;
};