"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@/types";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Get initial session
    const getUser = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser) {
        // Fetch full user profile
        const { data: profile, error } = await supabase
          .from("users")
          .select("id, email, name, role, department, status, team_id, created_at, updated_at")
          .eq("id", authUser.id)
          .single();

        if (error) {
          console.error("Error fetching user profile:", error);
        } else {
          setUser(profile);
        }
      }
      setLoading(false);
    };

    getUser();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { data: profile, error } = await supabase
          .from("users")
          .select("id, email, name, role, department, status, team_id, created_at, updated_at")
          .eq("id", session.user.id)
          .single();

        if (error) {
          console.error("Error fetching user profile:", error);
        } else {
          setUser(profile);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return {
    user,
    loading,
    signOut,
    isAuthenticated: !!user,
  };
}