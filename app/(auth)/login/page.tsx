"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Mail, Lock } from "lucide-react";

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
    setLoading(true);

    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        toast.error("Login failed", {
          description: error.message,
        });
        setLoading(false);
        return;
      }

      if (authData.user) {
        try {
          await fetch("/api/auth/session", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          });
        } catch (error) {
          console.error("Failed to set session cookie:", error);
        }

        toast.success("Welcome back!", {
          description: "You have successfully logged in.",
        });
        router.push("/dashboard");
        router.refresh();
        return;
      }
    } catch (error) {
      toast.error("An error occurred", {
        description: "Please try again later.",
      });
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
      `}</style>

      <main className="flex min-h-screen w-full font-body">
        {/* Left Panel - Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#1a3a6b] via-[#224794] to-[#2a5cb8] p-12 xl:p-16 flex-col justify-between">
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
              <h1 className="font-heading text-5xl xl:text-6xl font-bold text-white leading-tight flex items-baseline gap-3">
                <span>Welcome to</span>
                <span lang="ur" className="font-urdu text-orange-300 text-6xl xl:text-7xl">
                  داستان
                </span>
              </h1>
            </div>
            <p className="text-lg xl:text-xl text-blue-100 leading-relaxed">
              Your story development management system — where creativity meets organization.
            </p>
          </div>

          {/* Simple bottom decoration */}
          <div className="h-1 w-24 bg-orange-500 rounded-full" />
        </div>

        {/* Right Panel - Login Form */}
        <div className="flex-1 lg:w-1/2 flex items-center justify-center p-8 sm:p-12 bg-white">
          <div className="w-full max-w-md">
            {/* Mobile logo */}
            <div className="lg:hidden mb-8 text-center">
              <Image
                src="/Geo-Logo1.png"
                alt="Dastaan Portal Logo"
                width={64}
                height={64}
                priority
                className="w-auto h-14 object-contain mx-auto mb-3"
              />
              <h1 className="font-heading text-2xl font-bold text-gray-900">
                Dastaan Portal
              </h1>
              <p
                dir="rtl"
                lang="ur"
                className="text-xl font-bold font-urdu text-orange-500 mt-1"
              >
                داستان
              </p>
            </div>

            {/* Form header */}
            <div className="mb-8">
              <h2 className="font-heading text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                Sign In
              </h2>
              <p className="text-gray-600 text-lg">
                Access your creative workspace
              </p>
            </div>

            {/* Login form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                <div className={`input-field rounded-lg ${errors.email ? 'border-2 border-red-500' : 'border border-gray-200'}`}>
                  <Input
                    id="email"
                    type="email"
                    placeholder="yourname@geo.com"
                    {...register("email")}
                    disabled={loading}
                    className="h-12 text-base bg-gray-50/50 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-600 font-medium flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-red-600" />
                    {errors.email.message}
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
                <div className={`input-field rounded-lg ${errors.password ? 'border-2 border-red-500' : 'border border-gray-200'}`}>
                  <PasswordInput
                    id="password"
                    placeholder="Enter your password"
                    {...register("password")}
                    disabled={loading}
                    error={!!errors.password}
                    className="h-12 text-base bg-gray-50/50 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
                {errors.password && (
                  <p className="text-sm text-red-600 font-medium flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-red-600" />
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Submit button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  className="btn-primary w-full h-12 text-base font-semibold text-white rounded-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading || !isValid}
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
