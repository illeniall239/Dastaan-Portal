import { CrossTeamSharesTable } from '@/components/cross-team-shares/cross-team-shares-table';

export default function ProgrammerCrossTeamSharesPage() {
  return (
    <div className="mobile-container mobile-section space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          Cross-Team Shares Tracking
        </h1>
        <p className="text-gray-500 mt-1">
          Track cross-team shares between teams
        </p>
      </div>

      {/* All requests (sent and received) */}
      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-3">All Cross-Team Shares</h2>
        <CrossTeamSharesTable />
      </div>
    </div>
  );
}
