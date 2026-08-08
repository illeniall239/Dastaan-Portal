/** Convert commitment_schedule to expected episodes per day */
export function expectedPerDay(schedule: string): number {
  switch (schedule) {
    case "4_per_week": return 4 / 7;
    case "3_per_week": return 3 / 7;
    case "2_per_week": return 2 / 7;
    case "1_per_week": return 1 / 7;
    case "3_per_month": return 3 / 30;
    case "2_per_month": return 2 / 30;
    case "1_per_month": return 1 / 30;
    default: return 0;
  }
}

/** Convert commitment_schedule to expected episodes per month */
export function expectedPerMonth(schedule: string): number {
  return expectedPerDay(schedule) * 30;
}

/** Convert commitment_per_week number to per-month */
export function weeklyToMonthly(perWeek: number): number {
  return perWeek * (30 / 7);
}

/** Human-readable schedule label */
export function scheduleLabel(schedule: string): string {
  switch (schedule) {
    case "4_per_week": return "4/week";
    case "3_per_week": return "3/week";
    case "2_per_week": return "2/week";
    case "1_per_week": return "1/week";
    case "3_per_month": return "3/month";
    case "2_per_month": return "2/month";
    case "1_per_month": return "1/month";
    default: return schedule?.replace(/_/g, " ") || "Custom";
  }
}

/** Color band for delivery rate percentage (matches Excel thresholds) */
export function deliveryRateColor(percent: number): {
  label: string;
  bg: string;
  text: string;
  border: string;
} {
  if (percent >= 85) return { label: "Green", bg: "bg-green-100", text: "text-green-800", border: "border-green-300" };
  if (percent >= 80) return { label: "Grey", bg: "bg-gray-200", text: "text-gray-700", border: "border-gray-400" };
  if (percent >= 60) return { label: "Orange", bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-300" };
  return { label: "Red", bg: "bg-red-100", text: "text-red-800", border: "border-red-300" };
}
