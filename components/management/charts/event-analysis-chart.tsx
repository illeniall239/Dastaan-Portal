"use client";

import { useState } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp } from "lucide-react";
import { EventAnalysisData, EventDetail } from "@/lib/management/episode-pipeline";

interface EventAnalysisChartProps {
  data: EventAnalysisData[];
  dramaTitle: string;
}

type ImpactFilter = "All" | "High Impact" | "Medium Impact" | "Low Impact";

interface ScatterPoint {
  episode: number;
  position: number;
  event: EventDetail;
  impact: string;
}

export function EventAnalysisChart({ data, dramaTitle }: EventAnalysisChartProps) {
  const [selectedImpact, setSelectedImpact] = useState<ImpactFilter>("All");
  const [hoveredEvent, setHoveredEvent] = useState<EventDetail | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No event data available for this drama
      </div>
    );
  }

  // Transform data to scatter points
  const scatterData: ScatterPoint[] = [];
  data.forEach((episodeData) => {
    episodeData.events.forEach((event, index) => {
      scatterData.push({
        episode: episodeData.episodeNumber,
        position: index + 1, // Start from 1, not 0
        event,
        impact: event.impact,
      });
    });
  });

  // Filter scatter points based on selected impact
  const filteredScatterData = selectedImpact === "All"
    ? scatterData
    : scatterData.filter(point => point.impact === selectedImpact);

  // Get color based on impact
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "High Impact":
        return "#ef4444"; // red-500
      case "Medium Impact":
        return "#f59e0b"; // amber-500
      case "Low Impact":
        return "#3b82f6"; // blue-500
      default:
        return "#6b7280"; // gray-500
    }
  };

  // Calculate statistics
  const allEvents = data.flatMap(ep => ep.events);
  const filteredAllEvents = selectedImpact === "All"
    ? allEvents
    : allEvents.filter(e => e.impact === selectedImpact);

  const totalCount = filteredAllEvents.length;
  const avgPerEpisode = data.length > 0 ? (totalCount / data.length).toFixed(1) : "0";

  const highImpactCount = allEvents.filter(e => e.impact === "High Impact").length;
  const mediumImpactCount = allEvents.filter(e => e.impact === "Medium Impact").length;
  const lowImpactCount = allEvents.filter(e => e.impact === "Low Impact").length;

  const maxEpisodeIdx = data.reduce((maxIdx, ep, idx) => {
    const getFiltered = (events: EventDetail[]) =>
      selectedImpact === "All" ? events : events.filter(e => e.impact === selectedImpact);
    const currentFiltered = getFiltered(ep.events).length;
    const maxFiltered = getFiltered(data[maxIdx].events).length;
    return currentFiltered > maxFiltered ? idx : maxIdx;
  }, 0);

  // Calculate max Y value for proper scaling
  const maxEventsPerEpisode = Math.max(...data.map(ep => ep.events.length));

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length > 0) {
      const point = payload[0].payload as ScatterPoint;
      const event = point.event;

      return (
        <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-3 max-w-xs">
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: getImpactColor(event.impact) }}
            />
            <span className="font-semibold text-sm">{event.impact}</span>
          </div>
          <p className="font-medium text-sm mb-1">{event.title}</p>
          <p className="text-xs text-muted-foreground mb-1">
            {event.description.substring(0, 100)}
            {event.description.length > 100 && '...'}
          </p>
          <p className="text-xs text-muted-foreground italic">
            — {event.evaluatorName}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Episode {point.episode}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">{dramaTitle} - Event Analysis</CardTitle>
            <CardDescription>
              Individual events across {data.length} episodes
              {selectedImpact !== "All" && ` (${selectedImpact} only)`}
            </CardDescription>
          </div>
          <TrendingUp className="h-6 w-6 text-muted-foreground" />
        </div>

        {/* Impact Filter Buttons */}
        <div className="flex gap-2 mt-4 flex-wrap">
          <Button
            size="sm"
            variant={selectedImpact === "All" ? "default" : "outline"}
            onClick={() => setSelectedImpact("All")}
            className={selectedImpact === "All" ? "bg-gray-600 hover:bg-gray-700" : ""}
          >
            All Events
          </Button>
          <Button
            size="sm"
            variant={selectedImpact === "High Impact" ? "default" : "outline"}
            onClick={() => setSelectedImpact("High Impact")}
            className={selectedImpact === "High Impact" ? "bg-red-500 hover:bg-red-600" : "hover:bg-red-50 hover:text-red-600 hover:border-red-300"}
          >
            <div className="w-3 h-3 rounded-full bg-red-500 mr-2" style={{ backgroundColor: "#ef4444" }} />
            High Impact ({highImpactCount})
          </Button>
          <Button
            size="sm"
            variant={selectedImpact === "Medium Impact" ? "default" : "outline"}
            onClick={() => setSelectedImpact("Medium Impact")}
            className={selectedImpact === "Medium Impact" ? "bg-amber-500 hover:bg-amber-600" : "hover:bg-amber-50 hover:text-amber-600 hover:border-amber-300"}
          >
            <div className="w-3 h-3 rounded-full bg-amber-500 mr-2" style={{ backgroundColor: "#f59e0b" }} />
            Medium Impact ({mediumImpactCount})
          </Button>
          <Button
            size="sm"
            variant={selectedImpact === "Low Impact" ? "default" : "outline"}
            onClick={() => setSelectedImpact("Low Impact")}
            className={selectedImpact === "Low Impact" ? "bg-blue-500 hover:bg-blue-600" : "hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"}
          >
            <div className="w-3 h-3 rounded-full bg-blue-500 mr-2" style={{ backgroundColor: "#3b82f6" }} />
            Low Impact ({lowImpactCount})
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-slate-50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{totalCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedImpact === "All" ? "Total Events" : `Total ${selectedImpact} Events`}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-slate-50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{avgPerEpisode}</div>
              <p className="text-xs text-muted-foreground mt-1">Avg per Episode</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">Episode {data[maxEpisodeIdx].episodeNumber}</div>
              <p className="text-xs text-muted-foreground mt-1">Highest Count</p>
            </CardContent>
          </Card>
        </div>

        {/* Scatter Chart */}
        <ResponsiveContainer width="100%" height={450}>
          <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              type="number"
              dataKey="episode"
              name="Episode"
              stroke="#64748b"
              style={{ fontSize: '12px' }}
              label={{ value: 'Episode', position: 'insideBottom', offset: -10, style: { fontSize: '12px' } }}
              domain={[0.5, data.length + 0.5]}
              ticks={data.map((_, idx) => idx + 1)}
            />
            <YAxis
              type="number"
              dataKey="position"
              name="Position"
              stroke="#64748b"
              style={{ fontSize: '12px' }}
              label={{ value: 'Event Count', angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }}
              domain={[0, maxEventsPerEpisode + 1]}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            <Scatter
              data={filteredScatterData}
              fill="#8884d8"
            >
              {filteredScatterData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getImpactColor(entry.impact)}
                  stroke="white"
                  strokeWidth={2}
                  r={7}
                  style={{ cursor: 'pointer' }}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>

        {/* Insights */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-sm text-blue-900 mb-2">Insights</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            {data[0] && data[0].events.filter(e => e.impact === "High Impact").length > 2 && (
              <li>• This drama starts with high-impact events ({data[0].events.filter(e => e.impact === "High Impact").length} red dots in Episode 1)</li>
            )}
            {highImpactCount === 0 && (
              <li>• This drama has no high-impact events across all episodes</li>
            )}
            {totalCount > 0 && parseFloat(avgPerEpisode) >= 5 && (
              <li>• Strong event density throughout the drama (avg {avgPerEpisode} events per episode)</li>
            )}
            {highImpactCount > mediumImpactCount + lowImpactCount && (
              <li>• Drama is dominated by high-impact events - intense and fast-paced</li>
            )}
            {data.length > 1 && data[data.length - 1].events.filter(e => e.impact === "High Impact").length > 3 && (
              <li>• Final episode has strong climax with multiple high-impact events</li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
