"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
import { createTeamSchema, type CreateTeamInput } from "@/lib/validations/teams";
import { toast } from "sonner";
import { Users, Loader2, Building2, FileText, Shield, User } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { createClient } from "@/lib/supabase/client";
import { useFormAutosave } from "@/lib/hooks/useFormAutosave";
import { DraftRestoreBanner } from "@/components/ui/draft-restore-banner";

interface Team {
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

export default function NewTeamPage() {
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamHeads, setTeamHeads] = useState<TeamHead[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isValid },
  } = useForm<CreateTeamInput>({
    resolver: zodResolver(createTeamSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      description: "",
      parent_team_id: undefined,
      team_type: undefined,
      team_head_id: undefined,
    },
  });

  // Autosave
  const { hasDraft, draftLoaded, draftUpdatedAt, saveDraft, loadDraft, clearDraft } = useFormAutosave({
    formType: "admin_create_team",
    entityId: "_new",
  });

  const [draftDismissed, setDraftDismissed] = useState(false);

  // Autosave on form state changes via React Hook Form watch
  useEffect(() => {
    const subscription = watch((data) => {
      saveDraft(data as Record<string, unknown>);
    });
    return () => subscription.unsubscribe();
  }, [watch, saveDraft]);

  const handleRestoreDraft = useCallback(async () => {
    const data = await loadDraft();
    if (data) {
      const d = data as Record<string, any>;
      reset({
        name: d.name || "",
        description: d.description || "",
        parent_team_id: d.parent_team_id || undefined,
        team_type: d.team_type || undefined,
        team_head_id: d.team_head_id || undefined,
      });
      setDraftDismissed(true);
      toast.success("Draft restored");
    }
  }, [loadDraft, reset]);

  const handleDiscardDraft = useCallback(async () => {
    await clearDraft();
    setDraftDismissed(true);
  }, [clearDraft]);

  // Fetch teams and potential team heads on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = createClient();

        // Fetch existing teams for parent team selection
        const { data: teamsData, error: teamsError } = await supabase
          .from("teams")
          .select("id, name, team_type")
          .order("name");

        if (teamsError) throw teamsError;
        setTeams(teamsData || []);

        // Fetch potential team heads (users with management roles)
        const { data: usersData, error: usersError } = await supabase
          .from("users")
          .select("id, name, email, role")
          .in("role", ["admin", "management", "content_creator", "evaluator"])
          .eq("status", "active")
          .order("name");

        if (usersError) throw usersError;
        setTeamHeads(usersData || []);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load teams and users");
      } finally {
        setTeamsLoading(false);
      }
    };

    fetchData();
  }, []);

  const onSubmit = async (data: CreateTeamInput) => {
    setLoading(true);

    try {
      const response = await fetch("/api/admin/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMessage = typeof result.error === 'string'
          ? result.error
          : "Failed to create team. Please check all fields.";
        toast.error("Team creation failed", {
          description: errorMessage,
        });
        return;
      }

      await clearDraft();
      toast.success("Team created successfully!", {
        description: `${data.name} has been added to the system.`,
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
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Create New Team</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Add a new team to the organization
            </p>
          </div>
        </div>
      </div>

      {/* Draft restore banner */}
      {!draftDismissed && (
        <DraftRestoreBanner
          hasDraft={hasDraft}
          draftLoaded={draftLoaded}
          onRestore={handleRestoreDraft}
          onDiscard={handleDiscardDraft}
          lastUpdated={draftUpdatedAt}
        />
      )}

      {/* Form Card */}
      <Card className="shadow-lg border-0">
        <CardHeader className="border-b bg-slate-50/50">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[#224794]" />
            Team Information
          </CardTitle>
          <CardDescription>
            Enter the details for the new team. Fields marked with * are required.
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                <p className="text-xs text-muted-foreground">
                  The team type helps organize and categorize teams
                </p>
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
                      defaultValue={field.value}
                      disabled={teamsLoading}
                    >
                      <SelectTrigger className={`touch-target ${errors.parent_team_id ? 'border-red-500' : ''}`}>
                        <SelectValue placeholder={teamsLoading ? "Loading teams..." : "Select a parent team (optional)"} />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.length === 0 && !teamsLoading ? (
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
                      defaultValue={field.value}
                      disabled={teamsLoading}
                    >
                      <SelectTrigger className={`touch-target ${errors.team_head_id ? 'border-red-500' : ''}`}>
                        <SelectValue placeholder={teamsLoading ? "Loading users..." : "Select a team head (optional)"} />
                      </SelectTrigger>
                      <SelectContent>
                        {teamHeads.length === 0 && !teamsLoading ? (
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
                <p className="text-xs text-muted-foreground">
                  Assign a team leader who will manage this team
                </p>
              </div>
            </div>

            {/* Security Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-3">
                <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-blue-900">Team Management Notice</p>
                  <p className="text-xs text-blue-700">
                    Teams help organize users and track performance metrics. You can assign users to
                    this team after creation. All admin actions are logged for audit purposes.
                  </p>
                </div>
              </div>
            </div>

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
                disabled={loading || !isValid}
                className="w-full sm:flex-1 bg-[#224794] hover:bg-[#1a3670]"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Team...
                  </>
                ) : (
                  <>
                    <Users className="mr-2 h-4 w-4" />
                    Create Team
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
