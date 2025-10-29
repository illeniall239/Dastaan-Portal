"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";
import { loginSchema, type LoginFormData } from "@/lib/validations/auth";
import { getRoleBasedRedirect } from "@/lib/utils";
import { toast } from "sonner";
import { Mail } from "lucide-react";

export function LoginForm() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    console.time("🔐 Total Login Time");
    setLoading(true);

    try {
      console.time("  ⏱️ Supabase Auth");
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      console.timeEnd("  ⏱️ Supabase Auth");

      if (error) {
        console.timeEnd("🔐 Total Login Time");
        toast.error("Login failed", {
          description: error.message,
        });
        setLoading(false);
        return;
      }

      if (authData.user) {
        // Set session cookie and get user profile for role-based routing
        let redirectPath = "/dashboard"; // Default fallback

        try {
          console.time("  ⏱️ Set Session Cookie");
          const sessionResponse = await fetch("/api/auth/session", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          });
          console.timeEnd("  ⏱️ Set Session Cookie");

          if (sessionResponse.ok) {
            const sessionData = await sessionResponse.json();
            if (sessionData.user?.role) {
              // Use role-based redirect for direct portal navigation
              redirectPath = getRoleBasedRedirect(sessionData.user.role);
            }
          }
        } catch (error) {
          console.error("❌ Failed to set session cookie:", error);
          // Continue with default redirect - middleware will handle routing
        }

        console.timeEnd("🔐 Total Login Time");
        toast.success("Welcome back!", {
          description: "You have successfully logged in.",
        });
        // Keep loading state active during redirect
        router.push(redirectPath);
        return;
      }
    } catch (error) {
      console.timeEnd("🔐 Total Login Time");
      toast.error("An error occurred", {
        description: "Please try again later.",
      });
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">
          Sign In
        </h2>
        <p className="text-gray-600">
          Sign in to your account to continue
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Email Field */}
        <div className="space-y-2">
          <Label htmlFor="email">
            Email <span className="text-red-500">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="yourname@geo.com"
            {...register("email")}
            disabled={loading}
            className={errors.email ? "border-red-500" : ""}
          />
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Mail className="h-3 w-3" />
            <span>Use your @geo.com organization email</span>
          </div>
          {errors.email && (
            <p className="text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <Label htmlFor="password">
            Password <span className="text-red-500">*</span>
          </Label>
          <PasswordInput
            id="password"
            placeholder="••••••••"
            {...register("password")}
            disabled={loading}
            error={!!errors.password}
          />
          {errors.password && (
            <p className="text-sm text-red-600">{errors.password.message}</p>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full"
          style={{ backgroundColor: '#224794' }}
          disabled={loading || !isValid}
        >
          {loading ? "Signing in..." : "Sign In"}
        </Button>

        {/* No self-signup in this system; hide sign-up link */}
      </form>
    </div>
  );
}
