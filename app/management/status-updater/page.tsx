"use client";

import { useEffect, useState } from "react";
import { StatusUpdaterTable } from "@/components/status-updater/status-updater-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ManagementStatusUpdaterPage() {
  const [ideasData, setIdeasData] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string>("management");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch data from the API route
      const response = await fetch('/api/management/active-ideas');

      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      setIdeasData(result.ideas || result);
      if (result.userRole) setUserRole(result.userRole);
      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load status data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, []);

  // Note: Automatic refresh has been removed. Manual refresh is now handled by the refresh button.

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Error Loading Data</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-500">{error}</p>
            <button 
              onClick={fetchData}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Retry
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardContent className="p-0">
          <div className="flex justify-end p-4 border-b border-slate-200">
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Data
            </button>
          </div>
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, idx) => (
                <Skeleton key={idx} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <StatusUpdaterTable ideas={ideasData} role={userRole} readOnly={true} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}