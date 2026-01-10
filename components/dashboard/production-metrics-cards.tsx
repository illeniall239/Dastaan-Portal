"use client";

/**
 * Production Metrics Cards Component
 *
 * Displays 7 production lifecycle metrics as clickable cards with drill-down capabilities.
 * Used across Programmer, Evaluator, and Management dashboards.
 *
 * @module components/dashboard/production-metrics-cards
 */

import { useState } from "react";
import { ModernStatCard } from "@/components/dashboard/modern-stat-card";
import { DrillDownModal, DrillDownData } from "@/components/management/drill-down-modal";
import {
  Users,
  FileText,
  PenTool,
  Film,
  Tv,
  CheckCircle2,
  MessageSquare,
} from "lucide-react";
import type { ProductionMetrics } from "@/types";

interface ProductionMetricsCardsProps {
  metrics: ProductionMetrics;
  showAllMetrics?: boolean; // If false, show condensed version
}

/**
 * Production Metrics Cards Component
 *
 * Features:
 * - 7 metric cards in responsive grid
 * - Cards 3, 4, and 7 are clickable (Scripts in Writing, Scripts Completed, Projects Aired)
 * - Clicking opens drill-down modal with slot breakdown or historical data
 * - Mobile-responsive layout
 *
 * @param metrics - Production metrics data
 * @param showAllMetrics - Whether to show all 7 metrics (default: true)
 */
export function ProductionMetricsCards({
  metrics,
  showAllMetrics = true,
}: ProductionMetricsCardsProps) {
  const [drillDownData, setDrillDownData] = useState<DrillDownData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  /**
   * Handle click on "Writers Engaged" card
   * Opens modal with list of unique writers
   */
  const handleWritersEngagedClick = () => {
    console.log('Writers Engaged clicked', metrics.uniqueWriters);

    // Show modal even if no data
    setDrillDownData({
      title: "Writers Engaged - List of Active Writers",
      subtitle: `${metrics.uniqueWritersCount} unique ${metrics.uniqueWritersCount === 1 ? 'writer' : 'writers'} currently engaged across ${metrics.uniqueWriters.length} ${metrics.uniqueWriters.length === 1 ? 'project' : 'projects'}`,
      type: "table",
      data: metrics.uniqueWriters || [],
      columns: [
        { key: "name", label: "Writer Name" },
        { key: "working_title", label: "Project" },
        { key: "team_name", label: "Team" },
        { key: "id", label: "Writer ID" },
      ],
    });
    setIsModalOpen(true);
  };

  /**
   * Handle click on "Stories in Discussion" card
   * Opens modal with list of stories in discussion
   */
  const handleStoriesInDiscussionClick = () => {
    console.log('Stories in Discussion clicked', metrics.storiesInDiscussionDetails);

    // Show modal even if no data
    setDrillDownData({
      title: "Stories in Discussion - Active Discussions",
      subtitle: `${metrics.storiesInDiscussion} ${metrics.storiesInDiscussion === 1 ? 'story' : 'stories'} currently in discussion phase`,
      type: "table",
      data: metrics.storiesInDiscussionDetails || [],
      columns: [
        { key: "working_title", label: "Working Title" },
        { key: "team_name", label: "Team" },
        { key: "writer_name", label: "Writer" },
        { key: "target_slot", label: "Target Slot" },
        {
          key: "created_at",
          label: "Created On",
          format: (val) =>
            val
              ? new Date(val).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })
              : '-',
        },
      ],
    });
    setIsModalOpen(true);
  };

  /**
   * Handle click on "Scripts in Writing" card
   * Opens modal with slot-wise breakdown and details
   */
  const handleScriptsInWritingClick = () => {
    console.log('Scripts in Writing clicked', metrics.scriptsInWriting);

    // Show detailed list of scripts in writing
    setDrillDownData({
      title: "Scripts in Writing - Detailed List",
      subtitle: `${metrics.scriptsInWriting.total} ${metrics.scriptsInWriting.total === 1 ? 'project' : 'projects'} currently in writing phase`,
      type: "table",
      data: metrics.scriptsInWriting.details || [],
      columns: [
        { key: "working_title", label: "Working Title" },
        { key: "team_name", label: "Team" },
        { key: "writer_name", label: "Writer" },
        { key: "target_slot", label: "Target Slot" },
        { key: "status", label: "Status" },
      ],
    });
    setIsModalOpen(true);
  };

  /**
   * Handle click on "Scripts Completed" card
   * Opens modal with detailed list
   */
  const handleScriptsCompletedClick = () => {
    console.log('Scripts Completed clicked', metrics.scriptsCompleted);

    // Show detailed list of completed scripts
    setDrillDownData({
      title: "Scripts Completed - Detailed List",
      subtitle: `${metrics.scriptsCompleted.total} completed ${metrics.scriptsCompleted.total === 1 ? 'script' : 'scripts'} ready for production`,
      type: "table",
      data: metrics.scriptsCompleted.details || [],
      columns: [
        { key: "working_title", label: "Working Title" },
        { key: "team_name", label: "Team" },
        { key: "writer_name", label: "Writer" },
        { key: "target_slot", label: "Target Slot" },
        { key: "status", label: "Status" },
      ],
    });
    setIsModalOpen(true);
  };

  /**
   * Handle click on "Projects on Shoot" card
   * Opens modal with list of projects currently shooting
   */
  const handleProjectsOnShootClick = () => {
    console.log('Projects on Shoot clicked', metrics.projectsOnShootDetails);

    // Show modal even if no data
    setDrillDownData({
      title: "Projects on Shoot - Currently Shooting",
      subtitle: `${metrics.projectsOnShoot} ${metrics.projectsOnShoot === 1 ? 'project' : 'projects'} currently on shoot`,
      type: "table",
      data: metrics.projectsOnShootDetails || [],
      columns: [
        { key: "working_title", label: "Working Title" },
        { key: "team_name", label: "Team" },
        { key: "writer_name", label: "Writer" },
        { key: "target_slot", label: "Target Slot" },
        { key: "status", label: "Status" },
      ],
    });
    setIsModalOpen(true);
  };

  /**
   * Handle click on "Projects on Air" card
   * Opens modal with list of projects currently on air
   */
  const handleProjectsOnAirClick = () => {
    console.log('Projects on Air clicked', metrics.projectsOnAirDetails);

    // Show modal even if no data
    setDrillDownData({
      title: "Projects on Air - Currently Broadcasting",
      subtitle: `${metrics.projectsOnAir} ${metrics.projectsOnAir === 1 ? 'project' : 'projects'} currently on air`,
      type: "table",
      data: metrics.projectsOnAirDetails || [],
      columns: [
        { key: "working_title", label: "Working Title" },
        { key: "on_air_title", label: "On-Air Title" },
        { key: "team_name", label: "Team" },
        { key: "target_slot", label: "Time Slot" },
        { key: "status", label: "Status" },
      ],
    });
    setIsModalOpen(true);
  };

  /**
   * Handle click on "Projects Aired" card
   * Opens modal with historical list
   */
  const handleProjectsAiredClick = () => {
    console.log('Projects Aired clicked', metrics.projectsAired);

    // Show modal even if no data
    setDrillDownData({
      title: "Projects Aired - Historical Archive",
      subtitle: `${metrics.projectsAired.total} ${metrics.projectsAired.total === 1 ? 'project' : 'projects'
        } completed their on-air run`,
      type: "table",
      data: metrics.projectsAired.projects || [],
      columns: [
        { key: "working_title", label: "Working Title" },
        { key: "on_air_title", label: "On-Air Title" },
        { key: "team_name", label: "Team" },
        { key: "slot", label: "Time Slot" },
        {
          key: "aired_date",
          label: "Completed On",
          format: (val) =>
            val
              ? new Date(val).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })
              : '-',
        },
      ],
    });
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Unique Writers Engaged (CLICKABLE) */}
        <div
          onClick={handleWritersEngagedClick}
          className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 rounded-2xl"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleWritersEngagedClick();
            }
          }}
          title="Click to view list of engaged writers"
        >
          <ModernStatCard
            title="Writers Engaged"
            value={metrics.uniqueWritersCount}
            icon={Users}
          />
        </div>

        {/* 2. Stories in Discussion (CLICKABLE) */}
        <div
          onClick={handleStoriesInDiscussionClick}
          className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 rounded-2xl"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleStoriesInDiscussionClick();
            }
          }}
          title="Click to view stories in discussion"
        >
          <ModernStatCard
            title="Stories in Discussion"
            value={metrics.storiesInDiscussion}
            icon={MessageSquare}
          />
        </div>

        {/* 3. Scripts in Writing (CLICKABLE) */}
        <div
          onClick={handleScriptsInWritingClick}
          className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 rounded-2xl"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleScriptsInWritingClick();
            }
          }}
          title="Click to view scripts in writing"
        >
          <ModernStatCard
            title="Scripts in Writing"
            value={metrics.scriptsInWriting.total}
            icon={PenTool}
          />
        </div>

        {/* 4. Scripts Completed (CLICKABLE) */}
        <div
          onClick={handleScriptsCompletedClick}
          className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 rounded-2xl"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleScriptsCompletedClick();
            }
          }}
          title="Click to view completed scripts"
        >
          <ModernStatCard
            title="Scripts Completed"
            value={metrics.scriptsCompleted.total}
            icon={FileText}
          />
        </div>

        {showAllMetrics && (
          <>
            {/* 5. Projects on Shoot (CLICKABLE) */}
            <div
              onClick={handleProjectsOnShootClick}
              className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 rounded-2xl"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleProjectsOnShootClick();
                }
              }}
              title="Click to view projects currently on shoot"
            >
              <ModernStatCard
                title="Projects on Shoot"
                value={metrics.projectsOnShoot}
                icon={Film}
              />
            </div>

            {/* 6. Projects on Air (CLICKABLE) */}
            <div
              onClick={handleProjectsOnAirClick}
              className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 rounded-2xl"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleProjectsOnAirClick();
                }
              }}
              title="Click to view projects currently on air"
            >
              <ModernStatCard
                title="Projects on Air"
                value={metrics.projectsOnAir}
                icon={Tv}
              />
            </div>

            {/* 7. Projects Aired (CLICKABLE) */}
            <div
              onClick={handleProjectsAiredClick}
              className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 rounded-2xl"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleProjectsAiredClick();
                }
              }}
              title="Click to view historical archive"
            >
              <ModernStatCard
                title="Projects Aired"
                value={metrics.projectsAired.total}
                icon={CheckCircle2}
              />
            </div>
          </>
        )}
      </div>

      {/* Drill-down Modal */}
      <DrillDownModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        data={drillDownData}
      />
    </>
  );
}
