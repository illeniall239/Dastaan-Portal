import { Info } from "lucide-react";

/** Shown wherever the content department gives an initial assessment: it counts towards the project's
 *  Content Head rating (averaged with the content head's evaluation). */
export function InitialAssessmentNote() {
  return (
    <p className="flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
      <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
      Please discuss your rating with your content head before giving it. It counts towards the project&apos;s rating, together with your content head&apos;s evaluation.
    </p>
  );
}
