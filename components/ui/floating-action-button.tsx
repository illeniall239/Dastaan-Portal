import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface FloatingActionButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label?: string;
  position?: 'bottom-right' | 'bottom-center' | 'bottom-left';
  className?: string;
}

/**
 * Floating Action Button (FAB) component
 * 56x56px for WCAG AAA touch targets
 * Position fixed with safe area padding for notched devices
 */
export function FloatingActionButton({
  onClick,
  icon,
  label,
  position = 'bottom-right',
  className
}: FloatingActionButtonProps) {
  const positionClasses = {
    'bottom-right': 'bottom-4 right-4 sm:bottom-6 sm:right-6',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2 sm:bottom-6',
    'bottom-left': 'bottom-4 left-4 sm:bottom-6 sm:left-6'
  };

  return (
    <Button
      onClick={onClick}
      aria-label={label || 'Add'}
      className={cn(
        // Base styles
        'fixed z-50 rounded-full shadow-2xl',
        'w-14 h-14', // 56x56px touch target
        'flex items-center justify-center',
        'p-0', // Remove default button padding
        // Colors and hover
        'bg-primary text-primary-foreground',
        'hover:bg-primary/90 hover:shadow-xl',
        'active:scale-95',
        // Animation
        'transition-all duration-300',
        'hover:scale-110',
        // Safe area padding
        'safe-bottom safe-right',
        // Position
        positionClasses[position],
        className
      )}
    >
      {icon}
    </Button>
  );
}
