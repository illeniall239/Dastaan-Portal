"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { calculateGrade, getGradeColorClasses } from "@/lib/validations/episodic-evaluations";

interface ScoreCardProps {
  label: string;
  description?: string;
  score: number;
  onChange: (score: number) => void;
  disabled?: boolean;
  showGrade?: boolean;
  gradeFn?: (score: number) => string;
  gradeColorFn?: (grade: string) => string;
}

export function ScoreCard({
  label,
  description,
  score,
  onChange,
  disabled = false,
  showGrade = true,
  gradeFn,
  gradeColorFn,
}: ScoreCardProps) {
  const rating = (gradeFn || calculateGrade)(score);
  const ratingColorClasses = (gradeColorFn || getGradeColorClasses)(rating);

  const handleChange = (value: string) => {
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 1 && numValue <= 10) {
      onChange(numValue);
    } else if (value === "") {
      onChange(1); // Default to 1 if empty
    }
  };

  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <Label htmlFor={`score-${label.replace(/\s+/g, "-").toLowerCase()}`} className="font-semibold">
              {label}
            </Label>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
        </div>

        {/* Desktop: horizontal layout */}
        <div className="hidden sm:flex items-center gap-4">
          <div className="flex-1">
            <Input
              id={`score-${label.replace(/\s+/g, "-").toLowerCase()}`}
              type="number"
              min="1"
              max="10"
              value={score}
              onChange={(e) => handleChange(e.target.value)}
              disabled={disabled}
              className="text-lg font-semibold text-center w-16"
            />
          </div>

          {/* Visual scale indicator */}
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => !disabled && onChange(value)}
                disabled={disabled}
                className={`
                  w-8 h-8 text-xs font-medium rounded transition-colors
                  ${score === value
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                  }
                  ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                `}
                title={`Score: ${value}`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile: vertical layout with 5x2 grid */}
        <div className="flex sm:hidden flex-col items-center gap-3">
          <div className="w-auto">
            <Input
              id={`score-mobile-${label.replace(/\s+/g, "-").toLowerCase()}`}
              type="number"
              min="1"
              max="10"
              value={score}
              onChange={(e) => handleChange(e.target.value)}
              disabled={disabled}
              className="text-lg font-semibold text-center w-16"
            />
          </div>

          {/* Visual scale indicator */}
          <div className="grid grid-cols-5 gap-2 justify-items-center">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => !disabled && onChange(value)}
                disabled={disabled}
                className={`
                  w-8 h-10 text-sm font-medium rounded transition-colors
                  ${score === value
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                  }
                  ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                `}
                title={`Score: ${value}`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>Score: {score}/10</span>
          </div>
          {showGrade && (
            <div className={`text-sm ${ratingColorClasses} p-2 bg-gray-50 rounded-md border border-gray-200`}>
              {rating}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
