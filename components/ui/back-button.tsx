"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";

interface BackButtonProps {
  /**
   * Fallback route to navigate to if there's no browser history
   * If not provided, will attempt to infer from current path
   */
  fallbackHref?: string;
  /**
   * Custom label for the button
   * @default "Back"
   */
  label?: string;
  /**
   * Button variant
   * @default "ghost"
   */
  variant?: "ghost" | "outline" | "default" | "secondary";
  /**
   * Button size
   * @default "default"
   */
  size?: "default" | "sm" | "lg" | "icon";
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * BackButton component with smart navigation
 *
 * Uses browser history if available, otherwise navigates to fallback route.
 * If no fallback is provided, attempts to infer portal dashboard from current path.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <BackButton />
 *
 * // With custom fallback
 * <BackButton fallbackHref="/evaluator/call-reports" />
 *
 * // With custom label and variant
 * <BackButton label="Go Back" variant="outline" />
 * ```
 */
export function BackButton({
  fallbackHref,
  label = "Back",
  variant = "ghost",
  size = "default",
  className = "",
}: BackButtonProps) {
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    // Check if there's browser history to go back to
    // This is a heuristic - we check if window.history.length > 1
    setCanGoBack(window.history.length > 1);
  }, []);

  const handleClick = () => {
    if (canGoBack && window.history.length > 1) {
      // Use browser back if we have history
      router.back();
    } else {
      // Otherwise, use fallback route
      const fallback = fallbackHref || inferFallbackRoute();
      router.push(fallback);
    }
  };

  /**
   * Infer fallback route from current path
   * Extracts portal name and navigates to its dashboard
   */
  const inferFallbackRoute = (): string => {
    if (typeof window === "undefined") return "/dashboard";

    const path = window.location.pathname;

    // Extract portal from path
    if (path.startsWith("/evaluator")) return "/evaluator";
    if (path.startsWith("/programmer")) return "/programmer";
    if (path.startsWith("/content-department")) return "/content-department";
    if (path.startsWith("/management")) return "/management";
    if (path.startsWith("/admin")) return "/admin";

    // Default fallback
    return "/dashboard";
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      className={className}
      type="button"
    >
      <ArrowLeft className="h-4 w-4 mr-2" />
      {label}
    </Button>
  );
}
