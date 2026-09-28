"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Mail, Lock, BarChart3, Download, Smartphone, X } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const [loading, setLoading] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIOSNonSafari, setIsIOSNonSafari] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    if (searchParams.get('error') === 'account_deactivated') {
      toast.error("Account deactivated", {
        description: "Your account has been deactivated. Please contact your administrator.",
        duration: 8000,
      });
    }
  }, [searchParams]);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) return;
    const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e); setShowInstallBanner(true); };
      window.addEventListener('beforeinstallprompt', handler);
      const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      if (isIOS) {
        setShowInstallBanner(true);
        const isSafari = /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|OPiOS|EdgiOS/.test(navigator.userAgent);
        if (!isSafari) setIsIOSNonSafari(true);
      }
      return () => window.removeEventListener('beforeinstallprompt', handler);
    } else { setShowInstallBanner(true); }
  }, []);

  const mobileForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    defaultValues: { email: "", password: "" },
  });
  const { errors: mobileErrors, isValid: mobileIsValid } = mobileForm.formState;

  const desktopForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    defaultValues: { email: "", password: "" },
  });
  const { errors: desktopErrors, isValid: desktopIsValid } = desktopForm.formState;

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);

    // Set timeout for login request (15 seconds)
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 15000)
    );

    try {
      // Race between login and timeout
      const authData = await Promise.race([
        supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        }),
        timeout
      ]) as any;

      const { data: authResult, error } = authData;

      if (error) {
        toast.error("Login failed", {
          description: error.message,
        });
        setLoading(false);
        return;
      }

      if (authResult.user) {
        // Check if account is active before allowing login
        const { data: profile } = await supabase
          .from('users')
          .select('status')
          .eq('id', authResult.user.id)
          .single();

        if (profile?.status === 'inactive') {
          await supabase.auth.signOut();
          toast.error("Account deactivated", {
            description: "Your account has been deactivated. Please contact your administrator.",
            duration: 8000,
          });
          setLoading(false);
          return;
        }

        try {
          // Also add timeout for session API call
          const sessionTimeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), 10000)
          );

          await Promise.race([
            fetch("/api/auth/session", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
            }),
            sessionTimeout
          ]);
        } catch (error) {
          console.error("Failed to set session cookie:", error);
          // Continue anyway as auth succeeded
        }

        toast.success("Welcome back!", {
          description: "You have successfully logged in.",
        });
        router.push("/dashboard");
        router.refresh();
        return;
      }
    } catch (error: any) {
      if (error.message === "timeout") {
        toast.error("Request timed out", {
          description: "The login request is taking too long. Please check your connection and try again.",
          duration: 5000,
        });
      } else {
        toast.error("An error occurred", {
          description: "Please try again later.",
        });
      }
      setLoading(false);
    }
  };

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap');

        .font-heading {
          font-family: 'Manrope', sans-serif;
          letter-spacing: -0.02em;
        }

        .font-body {
          font-family: 'Manrope', sans-serif;
        }

        .input-field {
          transition: all 0.2s ease;
        }

        .input-field:focus-within {
          border-color: #224794;
          box-shadow: 0 0 0 3px rgba(34, 71, 148, 0.1);
        }

        .btn-primary {
          background: linear-gradient(135deg, #224794 0%, #1e3f7f 100%);
          transition: all 0.2s ease;
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(34, 71, 148, 0.2), 0 0 0 2px rgba(247, 146, 36, 0.15);
        }

        .btn-primary:active:not(:disabled) {
          transform: translateY(0);
        }

        .logo-shadow {
          filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15));
        }

        .support-link {
          transition: color 0.2s ease;
        }

        .support-link:hover {
          color: #f79224;
        }

        /* Mobile v3 input styling */
        .v3-input {
          transition: all 0.2s ease;
          border: 1.5px solid #224794;
          box-shadow: 0 0 0 3px rgba(34, 71, 148, 0.08);
        }

        .v3-input:focus-within {
          border-color: #224794;
          box-shadow: 0 0 0 4px rgba(34, 71, 148, 0.12);
        }
      `}</style>

      {/* ===== MOBILE: v3 design — white, navy stroked inputs ===== */}
      <main className="lg:hidden min-h-screen flex flex-col justify-center font-body bg-white px-7 relative overflow-hidden" style={{ paddingTop: "calc(2.5rem + env(safe-area-inset-top, 0px))", paddingBottom: "calc(2.5rem + env(safe-area-inset-bottom, 0px))" }}>
        {/* Background watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0" aria-hidden="true">
          <Image
            src="/Geo-Logo1.png"
            alt=""
            width={400}
            height={400}
            className="w-[70vw] h-[70vw] max-w-[400px] max-h-[400px] object-contain opacity-[0.04] pointer-events-none"
          />
        </div>
        {/* Heading */}
        <div className="mb-7 text-center relative z-10">
          <h1 className="text-[30px] font-bold text-[#0A0D14] leading-tight tracking-tight mb-1.5 flex flex-wrap items-baseline justify-center gap-2">
            <span>Welcome to</span>
            <span lang="ur" className="font-urdu text-[#F2A33C] text-[34px]">داستان</span>
          </h1>
          <p className="text-[15px] text-[#667085]">Sign in to access your production workspace.</p>
        </div>

        {/* Install App Banner */}
        {showInstallBanner && (
          <div className="mb-5 p-3.5 bg-[#f5f7ff] border border-[#e0e5f0] rounded-xl relative z-10">
            <button
              onClick={() => setShowInstallBanner(false)}
              className="absolute top-2.5 right-2.5 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-start gap-3 pr-4">
              {installPrompt ? (
                <>
                  <Download className="w-5 h-5 text-[#224794] mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Install Dastaan Portal</p>
                    <p className="text-xs text-gray-500 mt-1">Install the app for quick access and stay logged in.</p>
                    <button
                      onClick={async () => {
                        installPrompt.prompt();
                        const { outcome } = await installPrompt.userChoice;
                        if (outcome === 'accepted') setShowInstallBanner(false);
                      }}
                      className="mt-2 px-3 py-1.5 bg-[#224794] text-white text-xs font-semibold rounded-lg hover:bg-[#1e3f7f] transition-colors"
                    >
                      Install App
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 text-[#224794] mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Install Dastaan Portal</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {isIOSNonSafari
                        ? <>Open this page in <span className="font-semibold">Safari</span>, then tap <span className="font-semibold">Share</span> → <span className="font-semibold">&quot;Add to Home Screen&quot;</span>.</>
                        : <>Tap <span className="font-semibold">Share</span> then <span className="font-semibold">&quot;Add to Home Screen&quot;</span> to install.</>
                      }
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={mobileForm.handleSubmit(onSubmit)} className="flex flex-col gap-[18px] relative z-10">
          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="mobile-email" className="text-[13px] font-medium text-[#344054]">Email address</label>
            <div className={`v3-input rounded-[12px] ${mobileErrors.email ? '!border-red-500 !shadow-none' : ''}`}>
              <Input
                id="mobile-email"
                type="email"
                placeholder="yourname@geo.com"
                {...mobileForm.register("email")}
                disabled={loading}
                className="h-[54px] text-[15px] bg-white border-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-[12px] placeholder:text-[#98A2B3]"
              />
            </div>
            {mobileErrors.email && (
              <p className="text-xs text-red-600 font-medium">{mobileErrors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label htmlFor="mobile-password" className="text-[13px] font-medium text-[#344054]">Password</label>
            <div className={`v3-input rounded-[12px] ${mobileErrors.password ? '!border-red-500 !shadow-none' : ''}`}>
              <PasswordInput
                id="mobile-password"
                placeholder="Enter your password"
                {...mobileForm.register("password")}
                disabled={loading}
                error={!!mobileErrors.password}
                className="h-[54px] text-[15px] bg-white border-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-[12px] placeholder:text-[#98A2B3]"
              />
            </div>
            {mobileErrors.password && (
              <p className="text-xs text-red-600 font-medium">{mobileErrors.password.message}</p>
            )}
          </div>

          {/* Remember me + Forgot password */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded border-[#D0D5DD] text-[#224794] focus:ring-[#224794]" />
              <span className="text-[13px] text-[#344054]">Remember me</span>
            </label>
            <button
              type="button"
              onClick={() => toast.info("Contact your administrator to reset your password.")}
              className="text-[13px] font-semibold text-[#224794]"
            >
              Forgot password?
            </button>
          </div>

          {/* Sign in button */}
          <Button
            type="submit"
            className="w-full h-[54px] text-[15.5px] font-semibold text-white bg-[#224794] hover:bg-[#1e3f7f] rounded-[12px] disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading || !mobileIsValid}
          >
            {loading ? "Signing in..." : "Sign in"}
          </Button>

        </form>

        {/* Footer */}
        <div className="mt-8 text-center relative z-10">
          <p className="text-[13px] text-[#667085]">Need help? <a href="mailto:rao.muhammad@geo.tv" className="font-semibold text-[#224794]">rao.muhammad@geo.tv</a></p>
        </div>
      </main>

      {/* ===== DESKTOP: Original side-by-side layout ===== */}
      <main className="hidden lg:flex min-h-screen w-full font-body">
        {/* Left Panel - Branding */}
        <div className="lg:w-1/2 bg-gradient-to-br from-[#1a3a6b] via-[#224794] to-[#2a5cb8] p-8 lg:p-10 xl:p-12 2xl:p-16 flex flex-col justify-between">
          {/* Logo at top */}
          <div>
            <Image
              src="/Geo-Logo1.png"
              alt="Dastaan Portal Logo"
              width={80}
              height={80}
              priority
              className="w-auto h-16 object-contain logo-shadow"
            />
          </div>

          {/* Centered branding content */}
          <div className="space-y-6 max-w-xl">
            <div className="space-y-2">
              <h1 className="font-heading text-3xl lg:text-3xl xl:text-4xl 2xl:text-6xl font-bold text-white leading-tight flex flex-wrap items-baseline gap-2 xl:gap-3">
                <span>Welcome to</span>
                <span lang="ur" className="font-urdu text-orange-300 text-4xl lg:text-4xl xl:text-5xl 2xl:text-7xl">
                  داستان
                </span>
              </h1>
            </div>
            <p className="text-lg xl:text-xl text-blue-100 leading-relaxed">
              Your story development management system — from pitch to script, tracked at every step.
            </p>
          </div>

          {/* Simple bottom decoration */}
          <div className="h-1 w-24 bg-orange-500 rounded-full" />
        </div>

        {/* Right Panel - Login Form */}
        <div className="flex-1 lg:w-1/2 flex items-center justify-center p-8 sm:p-12 bg-white">
          <div className="w-full max-w-md">
            {/* Install App Banner */}
            {showInstallBanner && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg relative">
                <button
                  onClick={() => setShowInstallBanner(false)}
                  className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex items-start gap-3 pr-4">
                  <Smartphone className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Dastaan is now on mobile!</p>
                    <p className="text-xs text-gray-600 mt-1">Open this page on your phone to install the app.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Form header */}
            <div className="mb-8">
              <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                Sign In
              </h2>
              <p className="text-gray-600 text-base sm:text-lg">
                Access your professional workspace
              </p>
            </div>

            {/* Login form */}
            <form onSubmit={desktopForm.handleSubmit(onSubmit)} className="space-y-6">
              {/* Email field */}
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-sm font-semibold text-gray-700 flex items-center gap-2"
                >
                  <Mail className="w-4 h-4 text-blue-600" />
                  Email Address
                  <span className="text-orange-500">*</span>
                </Label>
                <div className={`input-field rounded-lg ${desktopErrors.email ? 'border-2 border-red-500' : 'border border-gray-200'}`}>
                  <Input
                    id="email"
                    type="email"
                    placeholder="yourname@geo.com"
                    {...desktopForm.register("email")}
                    disabled={loading}
                    className="h-12 text-base bg-gray-50/50 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
                {desktopErrors.email && (
                  <p className="text-sm text-red-600 font-medium flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-red-600" />
                    {desktopErrors.email.message}
                  </p>
                )}
              </div>

              {/* Password field */}
              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-sm font-semibold text-gray-700 flex items-center gap-2"
                >
                  <Lock className="w-4 h-4 text-blue-600" />
                  Password
                  <span className="text-orange-500">*</span>
                </Label>
                <div className={`input-field rounded-lg ${desktopErrors.password ? 'border-2 border-red-500' : 'border border-gray-200'}`}>
                  <PasswordInput
                    id="password"
                    placeholder="Enter your password"
                    {...desktopForm.register("password")}
                    disabled={loading}
                    error={!!desktopErrors.password}
                    className="h-12 text-base bg-gray-50/50 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
                {desktopErrors.password && (
                  <p className="text-sm text-red-600 font-medium flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-red-600" />
                    {desktopErrors.password.message}
                  </p>
                )}
              </div>

              {/* Submit button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  className="btn-primary w-full h-12 text-base font-semibold text-white rounded-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading || !desktopIsValid}
                >
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </div>

              {/* Support contact */}
              <div className="pt-4 text-sm text-center text-gray-600 border-t border-gray-100">
                <p className="mb-1 font-medium">Need help accessing your account?</p>
                <p>
                  Contact{' '}
                  <a
                    href="mailto:rao.muhammad@geo.tv"
                    className="support-link text-blue-600 font-semibold underline underline-offset-2"
                  >
                    rao.muhammad@geo.tv
                  </a>
                </p>
              </div>
            </form>
          </div>
        </div>
      </main>
    </>
  );
}
