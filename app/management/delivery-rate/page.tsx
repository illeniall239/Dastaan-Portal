import { DeliveryRateView } from "@/components/writers/delivery-rate-view";

// Read-only: the Programming team maintains these figures in their Delivery Rate tab
export default function ManagementDeliveryRatePage() {
  return (
    <div className="mobile-container mobile-section space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Delivery Rate</h1>
        <p className="text-sm text-gray-500 mt-1">
          Writer episode delivery rate vs commitment — grouped by team, as set by the Programming team
        </p>
      </div>

      <DeliveryRateView readOnly />
    </div>
  );
}
