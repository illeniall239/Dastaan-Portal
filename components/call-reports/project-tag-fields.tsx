"use client";

import { COMMERCIAL_POSITIONING_OPTIONS, AUDIENCE_FOCUS_OPTIONS } from "@/lib/project-tags";

interface ProjectTagFieldsProps {
  commercialPositioning: string;
  audienceFocus: string;
  onChange: (field: "commercialPositioning" | "audienceFocus", value: string) => void;
  required?: boolean;
  disabled?: boolean;
}

/** Commercial Positioning and Gender POV radio groups for the one-liner log and edit forms. */
export function ProjectTagFields({ commercialPositioning, audienceFocus, onChange, required, disabled }: ProjectTagFieldsProps) {
  const optionClass = (selected: boolean) =>
    `flex items-start gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
      selected ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/30"
    }`;

  return (
    <>
      <fieldset className="space-y-2" disabled={disabled}>
        <legend className="text-sm font-medium">Commercial Positioning{required && " *"}</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {COMMERCIAL_POSITIONING_OPTIONS.map((option) => (
            <label key={option.value} className={optionClass(commercialPositioning === option.value)}>
              <input
                type="radio"
                name="commercialPositioning"
                value={option.value}
                checked={commercialPositioning === option.value}
                onChange={(e) => onChange("commercialPositioning", e.target.value)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 mt-0.5"
              />
              <span>
                <span className="text-sm font-medium">{option.label}</span>
                <span className="block text-xs text-muted-foreground mt-0.5">{option.description}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2" disabled={disabled}>
        <legend className="text-sm font-medium">Gender POV{required && " *"}</legend>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {AUDIENCE_FOCUS_OPTIONS.map((option) => (
            <label key={option.value} className={optionClass(audienceFocus === option.value)}>
              <input
                type="radio"
                name="audienceFocus"
                value={option.value}
                checked={audienceFocus === option.value}
                onChange={(e) => onChange("audienceFocus", e.target.value)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 mt-0.5"
              />
              <span className="text-sm font-medium">{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </>
  );
}
