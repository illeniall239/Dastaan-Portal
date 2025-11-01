"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";
import { loginSchema, type LoginFormData } from "@/lib/validations/auth";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import { logger } from "@/lib/logger";

export default function LoginPage() {
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
    logger.time("🔐 Total Login Time");
    setLoading(true);

    try {
      logger.time("  ⏱️ Supabase Auth");
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      logger.timeEnd("  ⏱️ Supabase Auth");

      if (error) {
        logger.timeEnd("🔐 Total Login Time");
        toast.error("Login failed", {
          description: error.message,
        });
        setLoading(false);
        return;
      }

      if (authData.user) {
        // Set session cookie for fast navigation
        try {
          logger.time("  ⏱️ Set Session Cookie");
          await fetch("/api/auth/session", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          });
          logger.timeEnd("  ⏱️ Set Session Cookie");
          logger.dev("✅ Session cookie set successfully");
        } catch (error) {
          logger.error("❌ Failed to set session cookie:", error);
          // Continue anyway - middleware will fallback to DB query
        }

        logger.dev("🔄 Redirecting to dashboard...");
        logger.timeEnd("🔐 Total Login Time");
        toast.success("Welcome back!", {
          description: "You have successfully logged in.",
        });
        // Keep loading state active during redirect
        router.push("/dashboard");
        router.refresh();
        return;
      }
    } catch (error) {
      logger.timeEnd("🔐 Total Login Time");
      toast.error("An error occurred", {
        description: "Please try again later.",
      });
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col">
      {/* Logo at top left */}
      <div className="absolute top-4 sm:top-8 left-4 sm:left-8 z-10 animate-scale-in">
        <Image
          src="/Geo-Logo1.png"
          alt="Dastaan Portal Logo"
          width={0}
          height={0}
          priority
          sizes="(max-width: 640px) 40px, (max-width: 768px) 48px, 60px"
          quality={90}
          className="w-auto h-10 sm:h-12 md:h-[60px] object-contain"
          style={{ width: 'auto', height: 'auto', maxWidth: '100%' }}
        />
      </div>

      {/* Dastaan text at top right - Mobile only */}
      <div className="md:hidden absolute top-4 sm:top-8 right-4 sm:right-8 z-10 animate-scale-in">
        <div className="flex flex-col items-end gap-0.5">
          <span dir="rtl" lang="ur" className="text-xl sm:text-2xl font-bold text-gray-800 leading-tight font-urdu">داستان</span>
          <span className="text-sm sm:text-base font-bold text-gray-800">Dastaan</span>
        </div>
      </div>

      {/* Split screen layout - stacks on mobile */}
      <div className="flex flex-col md:flex-row w-full min-h-screen">
        {/* Left side - Welcome message - Hidden on mobile below sm */}
        <div className="hidden md:flex md:w-1/2 items-center justify-center bg-gradient-to-br from-blue-50 to-orange-50 p-6 md:p-12">
          <div className="max-w-lg text-center">
            <h1 className="text-3xl lg:text-5xl font-bold text-gray-800 mb-1 inline-block">
              Welcome to
            </h1>
            <div className="flex flex-col items-center gap-0.5 lg:gap-1">
              <span dir="rtl" lang="ur" className="text-4xl lg:text-6xl font-bold text-gray-800 inline-block leading-relaxed py-2 lg:py-3 font-urdu">داستان</span>
              <span className="text-2xl lg:text-4xl font-bold text-gray-800 inline-block">Dastaan</span>
            </div>
          </div>
        </div>

        {/* Right side - Login form */}
        <div className="flex-1 md:w-1/2 flex items-center justify-center bg-gradient-to-br from-blue-50 to-orange-50 md:bg-none md:bg-white p-4 sm:p-6 md:p-12 min-h-screen">
          <div className="w-full max-w-md">
            <div className="mb-6 sm:mb-8 text-center animate-stagger" style={{ animationDelay: '200ms' }}>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
                Sign In
              </h2>
              <p className="text-sm sm:text-base text-gray-600">
                Sign in to your account to continue
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
              {/* Email Field */}
              <div className="space-y-2 animate-stagger" style={{ animationDelay: '300ms' }}>
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
              <div className="space-y-2 animate-stagger" style={{ animationDelay: '400ms' }}>
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
              <div className="animate-stagger" style={{ animationDelay: '500ms' }}>
                <Button
                  type="submit"
                  className="w-full"
                  style={{ backgroundColor: '#224794' }}
                  disabled={loading || !isValid}
                >
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </div>

              {/* Contact for support */}
              <div className="text-sm text-center text-muted-foreground animate-stagger" style={{ animationDelay: '600ms' }}>
                In case of any problems please email{' '}
                <a href="mailto:rao.muhammad@geo.tv" className="text-blue-600 hover:text-blue-700 underline">
                  rao.muhammad@geo.tv
                </a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}