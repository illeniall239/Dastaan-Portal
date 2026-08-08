import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DeliveryRateView } from "@/components/writers/delivery-rate-view";

export const revalidate = 300;

export default async function DeliveryRatePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="mobile-container mobile-section space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          Delivery Rate
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Writer episode delivery rate vs commitment — grouped by team
        </p>
      </div>

      <DeliveryRateView />
    </div>
  );
}
