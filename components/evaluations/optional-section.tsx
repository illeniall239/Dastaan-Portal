import { ChevronDown } from "lucide-react";

/**
 * A section of an evaluation form beyond the Overall Grade, the email and the decision: collapsed by default
 * so the form reads as "grade, email, decision", and opened when the evaluator wants to fill it in.
 * Read-only views start it open (their content can't be clicked).
 */
export function OptionalSection({
  title,
  defaultOpen = false,
  optional = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={defaultOpen} className="group rounded-lg border border-gray-200 bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 select-none [&::-webkit-details-marker]:hidden">
        <span className="text-lg font-semibold text-gray-900">
          {title}
          {optional && <span className="ml-2 text-sm font-normal text-muted-foreground">(optional)</span>}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-4 px-4 pb-4">{children}</div>
    </details>
  );
}
