"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from "recharts";

interface Project {
  id: string;
  title: string;
  writer: string;
  slot?: string | null;
  teamName?: string | null;
}

interface CategoryEntry {
  label: string;
  count: number;
  projects: Project[];
}

interface ThemeEntry {
  keyword: string;
  count: number;
  projects: Project[];
}

interface GenreThemeData {
  themeCategories: CategoryEntry[];
  unevaluatedCount: number;
  topThemes: ThemeEntry[];
  totalProjects: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  "Commercial": "#3b82f6",
  "Commercial Edge": "#f59e0b",
  "Non Commercial": "#8b5cf6",
  "Signature Commercial": "#22c55e",
};

const THEME_COLOR = "#6366f1";

function DrillDialog({ title, badge, projects, onClose }: {
  title: string;
  badge: string;
  projects: Project[];
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[70vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-base">{title}</DialogTitle>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {badge}
            </Badge>
          </div>
        </DialogHeader>
        <div className="overflow-auto flex-1 -mx-6 px-6">
          {projects.length === 0 ? (
            <p className="text-center py-8 text-gray-400 text-sm">No projects</p>
          ) : (
            <div className="space-y-2">
              {projects.map((p) => (
                <div key={p.id} className="border rounded-lg p-2.5 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 leading-snug">{p.title}</p>
                    <p className="text-xs text-gray-500">{p.writer}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {p.teamName && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-200">
                        {p.teamName}
                      </Badge>
                    )}
                    {p.slot && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-gray-50">
                        {p.slot.replace(":00 ", "")}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function GenreThemeBreakdown() {
  const [data, setData] = useState<GenreThemeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [drill, setDrill] = useState<{ title: string; badge: string; projects: Project[] } | null>(null);

  useEffect(() => {
    fetch(`/api/management/genre-theme?_t=${Date.now()}`)
      .then((r) => r.json())
      .then((res) => setData(res.themeCategories ? res : null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No genre/theme data available.
        </CardContent>
      </Card>
    );
  }

  const { themeCategories, topThemes, unevaluatedCount } = data;

  const categoryData = themeCategories.map((c) => ({
    name: c.label,
    value: c.count,
    fill: CATEGORY_COLORS[c.label] || "#6b7280",
    projects: c.projects,
  }));

  const totalCategorized = categoryData.reduce((s, d) => s + d.value, 0);

  const handleCategoryClick = (d: any) => {
    if (d && d.value > 0) {
      setDrill({ title: d.name, badge: `${d.value} projects`, projects: d.projects });
    }
  };

  const handleThemeClick = (theme: ThemeEntry) => {
    setDrill({ title: theme.keyword, badge: `${theme.count} projects`, projects: theme.projects });
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Theme Category (Commercial Positioning) */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Commercial Positioning</h3>
            {totalCategorized === 0 ? (
              <p className="text-center py-8 text-gray-400 text-xs">No theme categories assigned yet</p>
            ) : (
              <div className="flex items-center gap-4">
                <div className="relative w-28 h-28 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={48}
                        paddingAngle={3}
                        dataKey="value"
                        onClick={handleCategoryClick}
                        cursor="pointer"
                      >
                        {categoryData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number, name: string) => [`${value} projects`, name]}
                        contentStyle={{ backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "12px" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-900">{totalCategorized}</div>
                    </div>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  {categoryData.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between text-xs cursor-pointer hover:bg-gray-50 rounded px-1.5 py-1 -mx-1 transition-colors"
                      onClick={() => handleCategoryClick(item)}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: item.fill }} />
                        <span className="text-gray-600">{item.name}</span>
                      </div>
                      <span className="font-semibold text-gray-800">{item.value}</span>
                    </div>
                  ))}
                  {unevaluatedCount > 0 && (
                    <p className="text-[10px] text-gray-400 mt-1">{unevaluatedCount} not yet categorized</p>
                  )}
                </div>
              </div>
            )}
            <p className="text-[10px] text-muted-foreground text-center mt-2">Click a segment to see projects</p>
          </CardContent>
        </Card>

        {/* Top Themes (Subject Matter) */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Top Themes / Subject Matter</h3>
            {topThemes.length === 0 ? (
              <p className="text-center py-8 text-gray-400 text-xs">No theme data available</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={topThemes.slice(0, 8)}
                  layout="vertical"
                  margin={{ top: 0, right: 10, bottom: 0, left: 0 }}
                >
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="keyword"
                    width={100}
                    tick={{ fontSize: 10, fill: "#6b7280" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(0,0,0,0.04)" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white border rounded-lg shadow-lg px-3 py-2 text-xs">
                          <p className="font-semibold text-gray-800">{d.keyword}</p>
                          <p className="text-gray-500">{d.count} {d.count === 1 ? "project" : "projects"}</p>
                          <p className="text-[10px] text-gray-400 mt-1">Click to view</p>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill={THEME_COLOR}
                    radius={[0, 4, 4, 0]}
                    cursor="pointer"
                    onClick={(d: any) => handleThemeClick(d)}
                    maxBarSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
            <p className="text-[10px] text-muted-foreground text-center mt-1">Click a bar to see projects</p>
          </CardContent>
        </Card>
      </div>

      {drill && (
        <DrillDialog
          title={drill.title}
          badge={drill.badge}
          projects={drill.projects}
          onClose={() => setDrill(null)}
        />
      )}
    </>
  );
}
