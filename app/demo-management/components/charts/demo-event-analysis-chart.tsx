'use client';

import { useState, useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DummyEventAnalysisData } from '../../lib/dummy-data';

type ImpactFilter = "All" | "High Impact" | "Medium Impact" | "Low Impact";
type ViewMode = "scatter" | "ecg";

interface ScatterDataPoint {
  episode: number;
  position: number;
  impact: string;
  title: string;
  description: string;
  evaluatorName: string;
}

interface DemoEventAnalysisChartProps {
  data: DummyEventAnalysisData[];
  dramaTitle: string;
}

export function DemoEventAnalysisChart({ data, dramaTitle }: DemoEventAnalysisChartProps) {
  const [selectedImpact, setSelectedImpact] = useState<ImpactFilter>("All");
  const [viewMode, setViewMode] = useState<ViewMode>("scatter");

  // Transform data into scatter plot format
  const scatterData = useMemo(() => {
    const points: ScatterDataPoint[] = [];
    data.forEach(episode => {
      episode.events.forEach((event, index) => {
        points.push({
          episode: episode.episodeNumber,
          position: index + 1,
          impact: event.impact,
          title: event.title,
          description: event.description,
          evaluatorName: event.evaluatorName,
        });
      });
    });
    return points;
  }, [data]);

  // Filter based on selection
  const filteredScatterData = selectedImpact === "All"
    ? scatterData
    : scatterData.filter(point => point.impact === selectedImpact);

  // Transform data into ECG frequency format
  const ecgData = useMemo(() => {
    return data.map(ep => ({
      episode: ep.episodeNumber,
      highCount: ep.events.filter(e => e.impact === 'High Impact').length,
      mediumCount: ep.events.filter(e => e.impact === 'Medium Impact').length,
      lowCount: ep.events.filter(e => e.impact === 'Low Impact').length,
      totalCount: ep.events.length,
    }));
  }, [data]);

  // Calculate statistics
  const highImpactCount = scatterData.filter(p => p.impact === "High Impact").length;
  const mediumImpactCount = scatterData.filter(p => p.impact === "Medium Impact").length;
  const lowImpactCount = scatterData.filter(p => p.impact === "Low Impact").length;

  // Color mapping
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'High Impact': return '#ef4444';
      case 'Medium Impact': return '#f59e0b';
      case 'Low Impact': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  // Max events per episode for Y-axis scaling
  const maxEventsPerEpisode = Math.max(
    ...data.map(ep => ep.events.length),
    1
  );

  // Custom Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg max-w-xs">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: getImpactColor(point.impact) }}
            />
            <span className="font-semibold text-sm">{point.impact}</span>
          </div>
          <p className="font-medium text-sm mb-1">{point.title}</p>
          <p className="text-xs text-muted-foreground mb-2">
            {point.description.substring(0, 100)}
            {point.description.length > 100 ? '...' : ''}
          </p>
          <p className="text-xs text-muted-foreground">
            Evaluator: {point.evaluatorName}
          </p>
          <p className="text-xs text-muted-foreground">
            Episode {point.episode}
          </p>
        </div>
      );
    }
    return null;
  };

  // ECG Tooltip
  const ECGTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-semibold text-sm mb-2">Episode {label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span>{entry.name}: {entry.value} events</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Statistics
  const totalCount = filteredScatterData.length;
  const avgPerEpisode = data.length > 0
    ? (totalCount / data.length).toFixed(1)
    : '0';

  const episodeWithMostEvents = data.reduce((max, ep) =>
    ep.events.length > max.events.length ? ep : max
  , data[0] || { episodeNumber: 0, events: [] });

  // Handle empty data
  if (data.length === 0 || scatterData.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">No event data available for this drama</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title and View Toggle */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold">{dramaTitle}</h3>
          <p className="text-sm text-muted-foreground">
            Event distribution by impact level across episodes
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={viewMode === "scatter" ? "default" : "outline"}
            onClick={() => setViewMode("scatter")}
          >
            Scatter View
          </Button>
          <Button
            size="sm"
            variant={viewMode === "ecg" ? "default" : "outline"}
            onClick={() => setViewMode("ecg")}
          >
            ECG View
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-50 p-4">
          <div className="text-2xl font-bold">{totalCount}</div>
          <p className="text-xs text-muted-foreground">
            {selectedImpact === "All" ? "Total Events" : `Total ${selectedImpact} Events`}
          </p>
        </Card>
        <Card className="bg-slate-50 p-4">
          <div className="text-2xl font-bold">{avgPerEpisode}</div>
          <p className="text-xs text-muted-foreground">Avg per Episode</p>
        </Card>
        <Card className="bg-slate-50 p-4">
          <div className="text-2xl font-bold">
            Episode {episodeWithMostEvents.episodeNumber}
          </div>
          <p className="text-xs text-muted-foreground">Highest Count</p>
        </Card>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 flex-wrap">
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
          className={
            selectedImpact === "High Impact"
              ? "bg-red-500 hover:bg-red-600"
              : "hover:bg-red-50 hover:text-red-700 hover:border-red-300"
          }
        >
          <div className="w-3 h-3 rounded-full bg-red-500 mr-2" />
          High Impact ({highImpactCount})
        </Button>
        <Button
          size="sm"
          variant={selectedImpact === "Medium Impact" ? "default" : "outline"}
          onClick={() => setSelectedImpact("Medium Impact")}
          className={
            selectedImpact === "Medium Impact"
              ? "bg-amber-500 hover:bg-amber-600"
              : "hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300"
          }
        >
          <div className="w-3 h-3 rounded-full bg-amber-500 mr-2" />
          Medium Impact ({mediumImpactCount})
        </Button>
        <Button
          size="sm"
          variant={selectedImpact === "Low Impact" ? "default" : "outline"}
          onClick={() => setSelectedImpact("Low Impact")}
          className={
            selectedImpact === "Low Impact"
              ? "bg-blue-500 hover:bg-blue-600"
              : "hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
          }
        >
          <div className="w-3 h-3 rounded-full bg-blue-500 mr-2" />
          Low Impact ({lowImpactCount})
        </Button>
      </div>

      {/* Chart - Conditional based on viewMode */}
      {viewMode === "scatter" ? (
        <ResponsiveContainer width="100%" height={450}>
          <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              type="number"
              dataKey="episode"
              name="Episode"
              domain={[0.5, data.length + 0.5]}
              ticks={data.map(ep => ep.episodeNumber)}
              label={{ value: 'Episode Number', position: 'insideBottom', offset: -5 }}
            />
            <YAxis
              type="number"
              dataKey="position"
              name="Position"
              domain={[0, maxEventsPerEpisode + 1]}
              label={{ value: 'Event Count', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Scatter data={filteredScatterData} fill="#8884d8">
              {filteredScatterData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getImpactColor(entry.impact)}
                  stroke="white"
                  strokeWidth={2}
                  r={7}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={450}>
          <LineChart data={ecgData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="episode"
              label={{ value: 'Episode Number', position: 'insideBottom', offset: -5 }}
            />
            <YAxis
              label={{ value: 'Event Frequency', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<ECGTooltip />} />
            <Legend />
            {(selectedImpact === "All" || selectedImpact === "High Impact") && (
              <Line
                type="monotone"
                dataKey="highCount"
                stroke="#ef4444"
                strokeWidth={3}
                dot={{ r: 5 }}
                activeDot={{ r: 7 }}
                name="High Impact"
              />
            )}
            {(selectedImpact === "All" || selectedImpact === "Medium Impact") && (
              <Line
                type="monotone"
                dataKey="mediumCount"
                stroke="#f59e0b"
                strokeWidth={3}
                dot={{ r: 5 }}
                activeDot={{ r: 7 }}
                name="Medium Impact"
              />
            )}
            {(selectedImpact === "All" || selectedImpact === "Low Impact") && (
              <Line
                type="monotone"
                dataKey="lowCount"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ r: 5 }}
                activeDot={{ r: 7 }}
                name="Low Impact"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      )}

    </div>
  );
}
