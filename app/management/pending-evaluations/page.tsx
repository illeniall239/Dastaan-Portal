import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PendingEvaluationsList } from "@/components/management/pending-evaluations-list";
import { PendingEpisodeApprovalsList } from "@/components/management/pending-episode-approvals-list";

export const dynamic = "force-dynamic";

export default async function PendingEvaluationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!["management", "admin", "executive"].includes(user.role)) {
    redirect("/dashboard");
  }

  const { tab } = await searchParams;
  const activeTab = tab === "episodes" ? "episodes" : "oneliners";

  const activeStyle =
    "bg-[#224794] text-white border-[#224794]";
  const inactiveStyle =
    "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300";

  return (
    <div className="mobile-container mobile-section space-y-4 sm:space-y-6">
      {/* Tab toggle */}
      <div className="flex gap-2">
        <Link
          href="/management/pending-evaluations?tab=oneliners"
          className={`py-2 px-4 rounded-md text-sm font-medium text-center border transition-colors ${
            activeTab === "oneliners" ? activeStyle : inactiveStyle
          }`}
        >
          One-Liners
        </Link>
        <Link
          href="/management/pending-evaluations?tab=episodes"
          className={`py-2 px-4 rounded-md text-sm font-medium text-center border transition-colors ${
            activeTab === "episodes" ? activeStyle : inactiveStyle
          }`}
        >
          Episodes
        </Link>
      </div>

      {/* Tab content */}
      {activeTab === "oneliners" ? (
        <PendingEvaluationsList userRole={user.role} userId={user.id} />
      ) : (
        <PendingEpisodeApprovalsList userId={user.id} userRole={user.role} />
      )}
    </div>
  );
}
