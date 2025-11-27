"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";

type BentoCardSize = '1x1' | '2x1' | '1x2' | '2x2' | '3x1' | '3x2' | '4x2';
type BentoCardVariant = 'metric' | 'content' | 'hero' | 'accent' | 'glass';
type BentoGradient = 'blue' | 'orange' | 'green' | 'purple' | 'red' | 'gray' | 'none';
type BorderAccent = 'left' | 'top' | 'none';

interface BentoCardProps {
  size: BentoCardSize;
  variant?: BentoCardVariant;
  gradient?: BentoGradient;
  borderAccent?: BorderAccent;
  accentColor?: 'blue' | 'orange' | 'green' | 'red';
  interactive?: boolean;
  href?: string;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
  // Luxury minimal enhancements
  glass?: boolean;           // Enable glass morphism
  innerGlow?: boolean;       // Subtle inner highlight
  minimalist?: boolean;      // Remove all decorative elements
}

const sizeClasses: Record<BentoCardSize, string> = {
  '1x1': 'col-span-2 sm:col-span-3 lg:col-span-3 row-span-1',
  '2x1': 'col-span-2 sm:col-span-6 lg:col-span-6 row-span-1',
  '1x2': 'col-span-2 sm:col-span-3 lg:col-span-3 row-span-2',
  '2x2': 'col-span-2 sm:col-span-6 lg:col-span-6 row-span-2',
  '3x1': 'col-span-2 sm:col-span-6 lg:col-span-9 row-span-1',
  '3x2': 'col-span-2 sm:col-span-6 lg:col-span-9 row-span-2',
  '4x2': 'col-span-2 sm:col-span-6 lg:col-span-12 row-span-2',
};

const gradientClasses: Record<BentoGradient, string> = {
  'blue': 'bento-gradient-blue',
  'orange': 'bento-gradient-orange',
  'green': 'bento-gradient-green',
  'purple': 'bento-gradient-purple',
  'red': 'bento-gradient-red',
  'gray': 'bento-gradient-gray',
  'none': '',
};

const heroGradientClasses: Record<BentoGradient, string> = {
  'blue': 'bento-gradient-hero-blue',
  'orange': 'bento-gradient-hero-orange',
  'green': 'bento-gradient-hero-green',
  'purple': 'bento-gradient-purple',
  'red': 'bento-gradient-red',
  'gray': 'bento-gradient-gray',
  'none': '',
};

const borderAccentClasses: Record<BorderAccent, Record<string, string>> = {
  'left': {
    'blue': 'bento-accent-left-blue',
    'orange': 'bento-accent-left-orange',
    'green': 'bento-accent-left-green',
    'red': 'bento-accent-left-red',
  },
  'top': {
    'blue': 'bento-accent-top-blue',
    'orange': 'bento-accent-top-orange',
    'green': 'bento-accent-top-green',
    'red': 'bento-accent-top-orange',
  },
  'none': {},
};

export function BentoCard({
  size,
  variant = 'content',
  gradient = 'none',
  borderAccent = 'none',
  accentColor = 'blue',
  interactive = false,
  href,
  onClick,
  className,
  children,
  glass = false,
  innerGlow = false,
  minimalist = false,
}: BentoCardProps) {
  const router = useRouter();

  const isHero = variant === 'hero';
  const isGlassVariant = variant === 'glass';

  const cardClasses = cn(
    // Base styles - use luxury-card for minimalist, otherwise bento-card
    minimalist ? 'luxury-card' : 'bento-card',

    // Size
    sizeClasses[size],

    // Variant-specific styles
    {
      'bento-card-hero': isHero && !minimalist,
      'bento-glass': isGlassVariant,
      'luxury-card-hero': isHero && minimalist,
    },

    // Glass morphism (new luxury feature)
    {
      'luxury-glass-mobile': glass,
      'luxury-inner-glow': innerGlow,
    },

    // Gradient (removed for minimalist)
    !minimalist && (isHero && gradient !== 'none' ? heroGradientClasses[gradient] : gradientClasses[gradient]),

    // Border accent (removed for minimalist)
    !minimalist && borderAccent !== 'none' && borderAccentClasses[borderAccent][accentColor],

    // Interactive
    {
      'bento-card-interactive cursor-pointer': interactive || !!href || !!onClick,
    },

    // Padding
    'p-4 sm:p-5 lg:p-6',

    // Custom classes
    className
  );

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (href) {
      router.push(href);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  const cardContent = <div className={cardClasses}>{children}</div>;

  // If href is provided, wrap in Link
  if (href && !onClick) {
    return (
      <Link href={href} className="block">
        {cardContent}
      </Link>
    );
  }

  // If interactive (onClick or href with onClick), make it a button
  if (interactive || onClick) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cardClasses}
        aria-label={typeof children === 'string' ? children : undefined}
      >
        {children}
      </div>
    );
  }

  // Otherwise, just a div
  return cardContent;
}
