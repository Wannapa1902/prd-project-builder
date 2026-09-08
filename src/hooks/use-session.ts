import { useEffect, useState } from "react";
import { supabase, type LocalSession } from "@/integrations/supabase/client";

export function useSession() {
  const [session, setSession] = useState<LocalSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(false);
    });
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { session, loading, user: session?.user ?? null };
}

export async function useIsAdmin(userId?: string): Promise<boolean> {
  if (!userId) return false;
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  return !!data;
}
