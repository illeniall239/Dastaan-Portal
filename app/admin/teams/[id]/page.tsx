"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateTeamSchema, type UpdateTeamInput } from "@/lib/validations/teams";
import { toast } from "sonner";
import { Users, Loader2, Building2, FileText, Shield, User } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { createClient } from "@/lib/supabase/client";

interface Team {
  id: string;
  name: string;
  description?: string | null;
  parent_team_id?: string | null;
  team_type: "production" | "channel" | "adaptation" | "evaluator" | "other";
  team_head_id?: string | null;
  member_count?: number;
  sub_teams_count?: number;
  created_at?: string;
  updated_at?: string;
}

interface SimpleTeam {
  id: string;
  name: string;
  team_type: string;
}

interface TeamHead {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function EditTeamPage() {
  const params = useParams();
  const teamId = params?.id as string;
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [teams, setTeams] = useState<SimpleTeam[]>([]);
  const [teamHeads, setTeamHeads] = useState<TeamHead[]>([]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isValid },
  } = useForm<UpdateTeamInput>({
    resolver: zodResolver(updateTeamSchema),
    mode: "onBlur",
  });

  // Fetch team data and other required data
  useEffect(() => {
    const fetchData = async () => {
      setPageLoading(true);
      try {
        const supabase = createClient();

        // Fetch current team data
        const teamResponse = await fetch(`/api/admin/teams/${teamId}`);
        if (!teamResponse.ok) {
          throw new Error("Failed to load team");
        }
        const teamData = await teamResponse.json();
        setCurrentTeam(teamData.team);

        // Fetch all teams for parent team selection (excluding current team)
        const { data: teamsData, error: teamsError } = await supabase
          .from("teams")
          .select("id, name, team_type")
          .neq("id", teamId)
          .order("name");

        if (teamsError) throw teamsError;
        setTeams(teamsData || []);

        // Fetch potential team heads
        const { data: usersData, error: usersError } = await supabase
          .from("users")
          .select("id, name, email, role")
          .in("role", ["admin", "management", "content_creator", "evaluator"])
          .eq("status", "active")
          .order("name");

        if (usersError) throw usersError;
        setTeamHeads(usersData || []);

        // Set form values
        reset({
          name: teamData.team.name,
          description: teamData.team.description || "",
          parent_team_id: teamData.team.parent_team_id || "",
          team_type: teamData.team.team_type,
          team_head_id: teamData.team.team_head_id || "",
        });
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load team data");
        router.push("/admin/teams");
      } finally {
        setPageLoading(false);
      }
    };

    if (teamId) {
      fetchData();
    }
  }, [teamId, router, reset]);

  const onSubmit = async (data: UpdateTeamInput) => {
    setLoading(true);

    try {
      const response = await fetch(`/api/admin/teams/${teamId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMessage = typeof result.error === 'string'
          ? result.error
          : "Failed to update team. Please check all fields.";
        toast.error("Team update failed", {
          description: errorMessage,
        });
        return;
      }

      toast.success("Team updated successfully!", {
        description: `${data.name || currentTeam?.name} has been updated.`,
      });
      router.push("/admin/teams");

    } catch (error) {
      toast.error("An error occurred", {
        description: "Please try again later.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentTeam) {
    return null;
  }

  return (
    <div className="mobile-container mobile-section space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <BackButton fallbackHref="/admin/teams" variant="ghost" className="-ml-2 hover:bg-slate-200 w-fit" label="Back to Teams" />

        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-[#224794] flex items-center justify-center flex-shrink-0">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Edit Team</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Update team information and hierarchy
            </p>
          </div>
        </div>
      </div>

      {/* Team Stats Card */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Members</div>
            <div className="text-2xl font-bold">{currentTeam.member_count || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Sub-teams</div>
            <div className="text-2xl font-bold">{currentTeam.sub_teams_count || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Form Card */}
      <Card className="shadow-lg border-0">
        <CardHeader className="border-b bg-slate-50/50">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[#224794]" />
            Team Information
          </CardTitle>
          <CardDescription>
            Update the team details. Fields marked with * are required.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                Basic Information
              </h3>

              {/* Name Field */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-500" />
                  Team Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  {...register("name")}
                  placeholder="e.g., Production Team Alpha"
                  className={`touch-target ${errors.name ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                />
                {errors.name && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    {errors.name.message}
                  </p>
                )}
              </div>

              {/* Description Field */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-500" />
                  Description <span className="text-slate-400">(Optional)</span>
                </Label>
                <Textarea
                  id="description"
                  {...register("description")}
                  placeholder="Brief description of the team's role and responsibilities"
                  className={`touch-target resize-none ${errors.description ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  rows={3}
                />
                {errors.description && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    {errors.description.message}
                  </p>
                )}
              </div>

              {/* Team Type Field */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4 text-slate-500" />
                  Team Type <span className="text-red-500">*</span>
                </Label>
                <Controller
                  control={control}
                  name="team_type"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <SelectTrigger className={`touch-target ${errors.team_type ? 'border-red-500' : ''}`}>
                        <SelectValue placeholder="Select a team type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="production">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-blue-500" />
                            Production Team
                          </div>
                        </SelectItem>
                        <SelectItem value="channel">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-purple-500" />
                            Channel Team
                          </div>
                        </SelectItem>
                        <SelectItem value="adaptation">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                            Adaptation Team
                          </div>
                        </SelectItem>
                        <SelectItem value="evaluator">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-yellow-500" />
                            Evaluator Team
                          </div>
                        </SelectItem>
                        <SelectItem value="other">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-gray-500" />
                            Other
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.team_type && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    {errors.team_type.message}
                  </p>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t pt-6" />

            {/* Hierarchy & Leadership Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                Hierarchy & Leadership
              </h3>

              {/* Parent Team Field */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-500" />
                  Parent Team <span className="text-slate-400">(Optional)</span>
                </Label>
                <Controller
                  control={control}
                  name="parent_team_id"
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || undefined}
                    >
                      <SelectTrigger className={`touch-target ${errors.parent_team_id ? 'border-red-500' : ''}`}>
                        <SelectValue placeholder="Select a parent team (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.length === 0 ? (
                          <div className="px-2 py-3 text-sm text-muted-foreground">
                            No teams available
                          </div>
                        ) : (
                          teams.map((team) => (
                            <SelectItem key={team.id} value={team.id}>
                              <div className="flex items-center gap-2">
                                <div className={`h-2 w-2 rounded-full ${
                                  team.team_type === 'production' ? 'bg-blue-500' :
                                  team.team_type === 'channel' ? 'bg-purple-500' :
                                  team.team_type === 'adaptation' ? 'bg-green-500' :
                                  team.team_type === 'evaluator' ? 'bg-yellow-500' :
                                  'bg-slate-500'
                                }`} />
                                {team.name}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.parent_team_id && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    {errors.parent_team_id.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Set a parent team to create a hierarchical structure
                </p>
              </div>

              {/* Team Head Field */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-500" />
                  Team Head <span className="text-slate-400">(Optional)</span>
                </Label>
                <Controller
                  control={control}
                  name="team_head_id"
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || undefined}
                    >
                      <SelectTrigger className={`touch-target ${errors.team_head_id ? 'border-red-500' : ''}`}>
                        <SelectValue placeholder="Select a team head (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {teamHeads.length === 0 ? (
                          <div className="px-2 py-3 text-sm text-muted-foreground">
                            No eligible users available
                          </div>
                        ) : (
                          teamHeads.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{user.name}</span>
                                <span className="text-xs text-muted-foreground">{user.email}</span>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.team_head_id && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    {errors.team_head_id.message}
                  </p>
                )}
              </div>
            </div>

            {/* Warning Notice */}
            {(currentTeam.member_count || 0) > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <Shield className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-yellow-900">Active Team</p>
                    <p className="text-xs text-yellow-700">
                      This team has {currentTeam.member_count} active member(s). Changes to team type
                      or hierarchy may affect user permissions and analytics.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/admin/teams")}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="w-full sm:flex-1 bg-[#224794] hover:bg-[#1a3670]"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating Team...
                  </>
                ) : (
                  <>
                    <Users className="mr-2 h-4 w-4" />
                    Update Team
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
