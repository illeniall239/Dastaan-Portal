"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleSignOut = async () => {
    setIsLoggingOut(true);

    try {
      // Use API route to ensure session cookie is cleared
      await fetch('/api/auth/signout', {
        method: 'POST',
      });

      // Keep loading active during redirect
      router.push('/login');
      router.refresh();
      return; // Don't set loading to false
    } catch (error) {
      console.error('Sign out error:', error);
      setIsLoggingOut(false);
    }
  };

  if (isLoggingOut) {
    return <LoadingSpinner text="Logging out..." />;
  }

  return (
    <Button onClick={handleSignOut} variant="outline" size="sm">
      Sign Out
    </Button>
  );
}
