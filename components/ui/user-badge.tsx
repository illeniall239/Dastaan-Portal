import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UserBadgeProps {
  name: string;
  email: string | null;
  onRemove: () => void;
  disabled?: boolean;
  isWriter?: boolean;
}

export function UserBadge({ name, email, onRemove, disabled, isWriter }: UserBadgeProps) {
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm ${
      isWriter ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
    }`}>
      <span className="font-medium">{name}</span>
      {email && <span className={`text-xs ${isWriter ? 'text-amber-600' : 'text-blue-600'}`}>({email})</span>}
      {!email && isWriter && <span className="text-xs text-amber-600">(Writer)</span>}
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
