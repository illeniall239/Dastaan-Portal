"use client";

import { Check, X } from "lucide-react";
import {
  calculatePasswordStrength,
  getPasswordRequirements,
  getStrengthColor,
  getStrengthTextColor,
} from "@/lib/utils/password";
import { cn } from "@/lib/utils";

interface PasswordStrengthProps {
  password: string;
  showRequirements?: boolean;
}

export function PasswordStrength({
  password,
  showRequirements = true,
}: PasswordStrengthProps) {
  const { score, strength } = calculatePasswordStrength(password);
  const requirements = getPasswordRequirements(password);

  // Don't show anything if password is empty
  if (!password) {
    return null;
  }

  return (
    <div className="space-y-2">
      {/* Strength Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Password strength:</span>
          <span
            className={cn(
              "font-medium capitalize",
              getStrengthTextColor(strength)
            )}
          >
            {strength}
          </span>
        </div>
        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-300",
              getStrengthColor(strength)
            )}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {/* Requirements List */}
      {showRequirements && (
        <div className="space-y-1">
          {requirements.map((requirement, index) => (
            <div
              key={index}
              className="flex items-center gap-2 text-sm"
            >
              {requirement.met ? (
                <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
              ) : (
                <X className="h-4 w-4 text-gray-400 flex-shrink-0" />
              )}
              <span
                className={cn(
                  requirement.met ? "text-green-600" : "text-muted-foreground"
                )}
              >
                {requirement.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
