import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Team, TeamType } from "@/types";

// Team type color mappings based on existing design system
const TEAM_TYPE_COLORS: Record<TeamType, string> = {
  production: "bg-blue-100 text-blue-800 border-blue-300",
  channel: "bg-purple-100 text-purple-800 border-purple-300",
  adaptation: "bg-green-100 text-green-800 border-green-300",
  evaluator: "bg-yellow-100 text-yellow-800 border-yellow-300",
  other: "bg-gray-100 text-gray-800 border-gray-300",
};

// Size variant classes
const SIZE_CLASSES = {
  sm: "text-xs px-2 py-0.5",
  md: "text-sm px-2.5 py-1",
};

interface TeamBadgeProps {
  team: Pick<Team, "name" | "team_type"> | null;
  showType?: boolean; // Show team type label (default: false)
  size?: "sm" | "md"; // Size variant (default: 'sm')
  className?: string;
}

/**
 * TeamBadge Component
 *
 * Displays a color-coded badge showing team name based on team type.
 * Used across the portal to identify which team owns/created content
 * when cross-team visibility is enabled.
 *
 * @param team - Team object with name and team_type, or null
 * @param showType - Optional flag to display team type alongside name
 * @param size - Badge size variant ('sm' or 'md')
 * @param className - Additional CSS classes
 */
export function TeamBadge({
  team,
  showType = false,
  size = "sm",
  className,
}: TeamBadgeProps) {
  // Handle missing team data gracefully
  if (!team) {
    return (
      <Badge
        variant="outline"
        className={cn(
          "text-gray-500 border-gray-200",
          SIZE_CLASSES[size],
          className
        )}
        title="Team information not available"
      >
        Unknown Team
      </Badge>
    );
  }

  // Get color class for team type, fallback to 'other' if invalid
  const colorClass = TEAM_TYPE_COLORS[team.team_type] || TEAM_TYPE_COLORS.other;

  return (
    <Badge
      variant="outline"
      className={cn(
        colorClass,
        SIZE_CLASSES[size],
        "border font-medium",
        className
      )}
      title={`Team: ${team.name}${showType ? ` (${team.team_type})` : ""}`}
    >
      {team.name}
      {showType && (
        <span className="ml-1 text-xs opacity-75">({team.team_type})</span>
      )}
    </Badge>
  );
}
