"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { Search, Users, Loader2, Building2, User, Calendar, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Team {
  id: string;
  name: string;
  description: string | null;
  parent_team_id: string | null;
  team_type: "production" | "channel" | "adaptation" | "evaluator" | "other";
  team_head_id: string | null;
  created_at: string;
  updated_at: string;
  team_head?: {
    id: string;
    name: string;
    email: string;
  } | null;
  member_count?: number;
}

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [deleting, setDeleting] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/teams");

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to load teams");
      }

      const data = await response.json();
      setTeams(data.teams || []);
    } catch (error) {
      logger.error("Error fetching teams:", error);
      toast.error("Failed to load teams", {
        description: error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  // Filter teams based on search
  const filteredTeams = useMemo(() => {
    if (!searchTerm) return teams;

    const lowerSearch = searchTerm.toLowerCase();
    return teams.filter(
      (team) =>
        team.name.toLowerCase().includes(lowerSearch) ||
        team.team_type.toLowerCase().includes(lowerSearch) ||
        team.team_head?.name.toLowerCase().includes(lowerSearch)
    );
  }, [searchTerm, teams]);

  const handleDeleteTeam = async () => {
    if (!teamToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/teams/${teamToDelete.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to delete team");
      }

      toast.success("Team deleted successfully", {
        description: `${teamToDelete.name} has been removed`,
      });

      fetchTeams();
      setDeleteDialogOpen(false);
      setTeamToDelete(null);
    } catch (error) {
      logger.error("Error deleting team:", error);
      toast.error("Failed to delete team", {
        description: error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getTeamTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      content:    "bg-blue-100 text-blue-800 border-blue-300",
      evaluator:  "bg-yellow-100 text-yellow-800 border-yellow-300",
      programmer: "bg-indigo-100 text-indigo-800 border-indigo-300",
      gcm:        "bg-teal-100 text-teal-800 border-teal-300",
      management: "bg-slate-100 text-slate-800 border-slate-300",
      other:      "bg-gray-100 text-gray-800 border-gray-300",
    };
    return colors[type] || "bg-gray-100 text-gray-800 border-gray-300";
  };

  const getTeamTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      content:    "Content Team",
      evaluator:  "Evaluator Team",
      programmer: "Programming Team",
      gcm:        "GCM Team",
      management: "Management Team",
      other:      "Other",
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mobile-container mobile-section">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3 sm:gap-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Team Management</h2>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Manage teams and hierarchies
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto touch-target bg-[#10b981] hover:bg-[#059669]">
          <Link href="/admin/teams/new">
            <Users className="h-4 w-4 mr-2" />
            Create Team
          </Link>
        </Button>
      </div>

      {/* Search Bar */}
      <div className="mb-4 sm:mb-6">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search teams..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 touch-target"
          />
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground mt-2">
          Showing {filteredTeams.length} of {teams.length} teams
        </p>
      </div>

      {/* Teams Table */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <ResponsiveTable
          columns={[
            { key: 'name', label: 'Team Name' },
            { key: 'type', label: 'Type' },
            { key: 'team_head', label: 'Team Head' },
            { key: 'members', label: 'Members' },
            { key: 'created', label: 'Created' },
            { key: 'actions', label: 'Actions' },
          ]}
          data={filteredTeams}
          renderRow={(team) => (
            <>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="font-medium text-gray-900">{team.name}</div>
                {team.description && (
                  <div className="text-xs text-gray-500 mt-1 truncate max-w-xs">
                    {team.description}
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Badge
                  variant="outline"
                  className={getTeamTypeBadgeColor(team.team_type)}
                >
                  {getTeamTypeLabel(team.team_type)}
                </Badge>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {team.team_head ? (
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {team.team_head.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {team.team_head.email}
                    </div>
                  </div>
                ) : (
                  <span className="text-sm text-gray-400">No team head</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Users className="h-4 w-4" />
                  <span>{team.member_count || 0}</span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                {formatDate(team.created_at)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/admin/teams/${team.id}/members`)}
                >
                  Members
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/admin/teams/${team.id}`)}
                >
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setTeamToDelete(team);
                    setDeleteDialogOpen(true);
                  }}
                >
                  Delete
                </Button>
              </td>
            </>
          )}
          renderMobileCard={(team) => (
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                {/* Team Name and Type */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base">{team.name}</h3>
                      <Badge
                        variant="outline"
                        className={`mt-1 text-xs ${getTeamTypeBadgeColor(team.team_type)}`}
                      >
                        {getTeamTypeLabel(team.team_type)}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {team.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {team.description}
                  </p>
                )}

                {/* Team Details */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {team.team_head ? team.team_head.name : "No team head"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {team.member_count || 0} member{team.member_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground text-xs">
                      Created {formatDate(team.created_at)}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="touch-target"
                    onClick={() => router.push(`/admin/teams/${team.id}/members`)}
                  >
                    Members
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="touch-target"
                    onClick={() => router.push(`/admin/teams/${team.id}`)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="touch-target"
                    onClick={() => {
                      setTeamToDelete(team);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          emptyMessage="No teams found"
        />
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Team</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{teamToDelete?.name}</strong>? This action
              cannot be undone. The team must have no active members or sub-teams.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTeam}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Team"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
