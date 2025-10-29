"use client";

import { createPortal } from "react-dom";

interface LoadingSpinnerProps {
  text?: string;
}

export function LoadingSpinner({ text = "Loading..." }: LoadingSpinnerProps) {
  // SSR safety check - portals only work in browser
  if (typeof window === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">{text}</p>
      </div>
    </div>,
    document.body
  );
}
