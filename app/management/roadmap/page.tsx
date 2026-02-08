import { getRoadmapList, calculateRoadmapStats } from "@/lib/roadmap/server";
import { RoadmapStatsCards, RoadmapList } from "@/components/roadmap";
import { Map } from "lucide-react";

export const metadata = {
  title: "Idea Roadmap | Management Portal",
  description: "Track the journey of ideas through all workflow stages",
};

export default async function ManagementRoadmapPage() {
  const items = await getRoadmapList();
  const stats = calculateRoadmapStats(items);

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-50 rounded-lg">
          <Map className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Idea Roadmap</h1>
          <p className="text-muted-foreground">
            Track the journey of ideas through all workflow stages
          </p>
        </div>
      </div>

      {/* Stats */}
      <RoadmapStatsCards stats={stats} />

      {/* List */}
      <RoadmapList items={items} />
    </div>
  );
}
