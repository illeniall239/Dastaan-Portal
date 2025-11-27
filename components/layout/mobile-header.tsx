"use client";

import { Menu } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

interface MobileHeaderProps {
  onMenuClick: () => void;
}

export function MobileHeader({ onMenuClick }: MobileHeaderProps) {
  return (
    <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-30 flex items-center px-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={onMenuClick}
        className="mr-3"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex items-center gap-2">
        <Image
          src="/Geo-Logo1.png"
          alt="Geo Logo"
          width={32}
          height={32}
          className="object-contain"
        />
        <div className="flex items-center gap-1.5">
          <span dir="rtl" lang="ur" className="text-sm font-semibold text-gray-900 font-urdu">
            داستان
          </span>
        </div>
      </div>
    </div>
  );
}
