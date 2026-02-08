import { CrossTeamSharesTable } from '@/components/cross-team-shares/cross-team-shares-table';

export default function ManagementCrossTeamSharesPage() {
  return (
    <div className="mobile-container mobile-section space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          Evaluation Requests
        </h1>
        <p className="text-gray-500 mt-1">
          Monitor evaluation requests sent between teams
        </p>
      </div>
      <CrossTeamSharesTable readOnly />
    </div>
  );
}
