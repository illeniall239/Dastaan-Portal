import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UserBadgeProps {
  name: string;
  email: string;
  onRemove: () => void;
  disabled?: boolean;
}

export function UserBadge({ name, email, onRemove, disabled }: UserBadgeProps) {
  return (
    <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
      <span className="font-medium">{name}</span>
      <span className="text-blue-600 text-xs">({email})</span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onRemove}
        disabled={disabled}
        className="h-4 w-4 p-0 hover:bg-blue-200 rounded-full ml-1"
        aria-label={`Remove ${name}`}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
