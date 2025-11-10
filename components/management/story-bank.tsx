"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ManagementCallReportsCards } from "@/components/management/management-call-reports-cards";
import { ManagementEpisodesCards } from "@/components/management/management-episodes-cards";

interface StoryBankProps {
  callReports: any[];
  episodes: any[];
}

export function StoryBank({ callReports, episodes }: StoryBankProps) {
  return (
    <Tabs defaultValue="call-reports" className="w-full">
      <TabsList className="grid w-full grid-cols-2 max-w-md">
        <TabsTrigger value="call-reports">
          Writer Engagement Reports ({callReports.length})
        </TabsTrigger>
        <TabsTrigger value="episodes">
          Episodes ({episodes.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="call-reports" className="mt-6">
        <ManagementCallReportsCards callReports={callReports} />
      </TabsContent>

      <TabsContent value="episodes" className="mt-6">
        <ManagementEpisodesCards episodes={episodes} />
      </TabsContent>
    </Tabs>
  );
}
