import { ManagementDashboardSkeleton } from "@/components/management/skeletons";

/**
 * Loading state for Management Dashboard
 * Next.js automatically shows this while the page is loading
 * Enables instant feedback and streaming SSR
 */
export default function Loading() {
  return <ManagementDashboardSkeleton />;
}
