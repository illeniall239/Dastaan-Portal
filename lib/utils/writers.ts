import type { CallReport } from "@/types";

/**
 * Get a display-friendly string of writer names from a call report.
 *
 * This function handles multiple writers consistently across the application:
 * - Uses writer_names array if available (preferred)
 * - Falls back to writers array if writer_names not populated
 * - Falls back to legacy writer_name field for backward compatibility
 * - Returns "Unknown" if no writer information available
 *
 * @param report - The call report object
 * @param options - Display options
 * @param options.separator - String to join multiple writers (default: ", ")
 * @param options.fallback - String to return if no writers found (default: "Unknown")
 * @returns Display-friendly string of writer names
 *
 * @example
 * ```typescript
 * // With writer_names array
 * const report = { writer_names: ["John Doe", "Jane Smith"] };
 * getWriterDisplayName(report); // "John Doe, Jane Smith"
 *
 * // With legacy writer_name
 * const oldReport = { writer_name: "John Doe" };
 * getWriterDisplayName(oldReport); // "John Doe"
 *
 * // Custom separator
 * getWriterDisplayName(report, { separator: " & " }); // "John Doe & Jane Smith"
 * ```
 */
export function getWriterDisplayName(
  report: Pick<CallReport, "writer_name" | "writers" | "writer_names">,
  options: {
    separator?: string;
    fallback?: string;
  } = {}
): string {
  const { separator = ", ", fallback = "Unknown" } = options;

  // Priority 1: Use writer_names array if available
  if (report.writer_names && report.writer_names.length > 0) {
    return report.writer_names.join(separator);
  }

  // Priority 2: Extract names from writers array
  if (report.writers && report.writers.length > 0) {
    const names = report.writers
      .map((w) => w.writer_name)
      .filter((name) => name && name.trim() !== "");

    if (names.length > 0) {
      return names.join(separator);
    }
  }

  // Priority 3: Fall back to legacy writer_name field
  if (report.writer_name && report.writer_name.trim() !== "") {
    return report.writer_name;
  }

  // No writer information available
  return fallback;
}

/**
 * Get the appropriate label for writer field based on count.
 * Returns "Writer:" for single writer, "Writers:" for multiple.
 *
 * @param report - The call report object
 * @returns "Writer:" or "Writers:"
 *
 * @example
 * ```typescript
 * const singleReport = { writer_names: ["John Doe"] };
 * getWriterLabel(singleReport); // "Writer:"
 *
 * const multiReport = { writer_names: ["John Doe", "Jane Smith"] };
 * getWriterLabel(multiReport); // "Writers:"
 * ```
 */
export function getWriterLabel(
  report: Pick<CallReport, "writer_name" | "writers" | "writer_names">
): string {
  // Check writer_names array first
  if (report.writer_names && report.writer_names.length > 1) {
    return "Writers:";
  }

  // Check writers array
  if (report.writers && report.writers.length > 1) {
    return "Writers:";
  }

  // Default to singular
  return "Writer:";
}

/**
 * Check if a call report has multiple writers.
 *
 * @param report - The call report object
 * @returns true if report has multiple writers, false otherwise
 *
 * @example
 * ```typescript
 * const report = { writer_names: ["John", "Jane"] };
 * hasMultipleWriters(report); // true
 * ```
 */
export function hasMultipleWriters(
  report: Pick<CallReport, "writer_name" | "writers" | "writer_names">
): boolean {
  if (report.writer_names && report.writer_names.length > 1) {
    return true;
  }

  if (report.writers && report.writers.length > 1) {
    return true;
  }

  return false;
}

/**
 * Get the count of writers for a call report.
 *
 * @param report - The call report object
 * @returns Number of writers (minimum 1 if any writer data exists)
 *
 * @example
 * ```typescript
 * const report = { writer_names: ["John", "Jane"] };
 * getWriterCount(report); // 2
 * ```
 */
export function getWriterCount(
  report: Pick<CallReport, "writer_name" | "writers" | "writer_names">
): number {
  if (report.writer_names && report.writer_names.length > 0) {
    return report.writer_names.length;
  }

  if (report.writers && report.writers.length > 0) {
    return report.writers.length;
  }

  if (report.writer_name && report.writer_name.trim() !== "") {
    return 1;
  }

  return 0;
}
