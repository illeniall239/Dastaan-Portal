import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AnnualTargetTracker } from "@/components/dashboard/annual-target-tracker";

export const revalidate = 300;

export default async function AnnualTargetsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="mobile-container mobile-section space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          Annual Target vs Current Situation
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Comparison of annual target & current situation of scripts for {new Date().getFullYear()}
        </p>
      </div>

      <AnnualTargetTracker />
    </div>
  );
}
