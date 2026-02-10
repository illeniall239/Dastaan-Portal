"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminCreateUserSchema, type AdminCreateUserFormData } from "@/lib/validations/auth";
import { toast } from "sonner";
import { UserPlus, Mail, Lock, User, Briefcase, Building2, Shield, Loader2, Users } from "lucide-react";
import Link from "next/link";
import { BackButton } from "@/components/ui/back-button";
import { createClient } from "@/lib/supabase/client";
import type { Team } from "@/types";
import { useFormAutosave } from "@/lib/hooks/useFormAutosave";
import { DraftRestoreBanner } from "@/components/ui/draft-restore-banner";

export default function NewUserPage() {
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isValid },
  } = useForm<AdminCreateUserFormData>({
    resolver: zodResolver(adminCreateUserSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      email: "",
      password: "",
      position: "",
      department: undefined,
      team_id: undefined,
    },
  });

  // Autosave
  const { hasDraft, draftLoaded, draftUpdatedAt, saveDraft, loadDraft, clearDraft } = useFormAutosave({
    formType: "admin_create_user",
    entityId: "_new",
  });

  const [draftDismissed, setDraftDismissed] = useState(false);

  // Autosave on form state changes via React Hook Form watch
  useEffect(() => {
    const subscription = watch((data) => {
      // Don't save password in draft
      const { password, ...safeData } = data;
      saveDraft(safeData as Record<string, unknown>);
    });
    return () => subscription.unsubscribe();
  }, [watch, saveDraft]);

  const handleRestoreDraft = useCallback(async () => {
    const data = await loadDraft();
    if (data) {
      const d = data as Record<string, any>;
      reset({
        name: d.name || "",
        email: d.email || "",
        password: "",
        position: d.position || "",
        department: d.department || undefined,
        team_id: d.team_id || undefined,
      });
      setDraftDismissed(true);
      toast.success("Draft restored (password must be re-entered)");
    }
  }, [loadDraft, reset]);

  const handleDiscardDraft = useCallback(async () => {
    await clearDraft();
    setDraftDismissed(true);
  }, [clearDraft]);

  // Format team name for display
  const formatTeamName = (team: Team): string => {
    if (team.team_head?.name) {
      return `${team.team_head.name}'s Team`;
    }
    // Fallback: use team head's email if name is not available
    if (team.team_head?.email) {
      return `${team.team_head.email}'s Team`;
    }
    // Final fallback for teams without heads
    return team.name || "Unnamed Team";
  };

  // Fetch teams on component mount
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("teams")
          .select(`
            id,
            name,
            team_type,
            parent_team_id,
            created_at,
            updated_at,
            team_head_id,
            team_head:users!team_head_id(id, name, email)
          `)
          .not('team_head_id', 'is', null)  // Filter out orphaned teams
          .order("name");

        if (error) throw error;

        // Transform the data: Supabase returns team_head as array, we need single object
        const transformedTeams = (data || []).map(team => ({
          ...team,
          team_head: Array.isArray(team.team_head) ? team.team_head[0] || null : team.team_head
        })) as Team[];

        setTeams(transformedTeams);
      } catch (error) {
        console.error("Error fetching teams:", error);
        toast.error("Failed to load teams");
      } finally {
        setTeamsLoading(false);
      }
    };

    fetchTeams();
  }, []);

  const onSubmit = async (data: AdminCreateUserFormData) => {
    setLoading(true);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        // Log full error for debugging
        console.error("User creation failed:", {
          status: response.status,
          result,
          timestamp: new Date().toISOString(),
        });

        // Determine user-friendly message based on error code
        let userMessage = "Failed to create user";
        let userDescription = "An unexpected error occurred. Please try again.";

        if (result.code === 'UNIQUE_VIOLATION') {
          userMessage = "User already exists";
          userDescription = "A user with this email address already exists in the system.";
        } else if (result.code === 'TRIGGER_ERROR') {
          userMessage = "Team creation failed";
          userDescription = "The user was created but automatic team setup failed. Please assign a team manually.";
        } else if (result.code === 'AUTH_ERROR') {
          userMessage = "Authentication setup failed";
          userDescription = "Could not create user authentication credentials.";
        } else if (result.code === 'VALIDATION_ERROR') {
          userMessage = "Invalid input";
          userDescription = result.message || "Please check all fields and try again.";
        } else if (result.message) {
          userDescription = result.message;
        }

        // In development, append technical details
        if (process.env.NODE_ENV === 'development' && result.details) {
          userDescription += `\n\nTechnical: ${result.details}`;
        }

        toast.error(userMessage, {
          description: userDescription,
        });
        return;
      }

      // Success
      await clearDraft();
      toast.success("User created successfully", {
        description: `User ${data.email} has been created and can now log in.`,
      });
      router.push("/admin/users");

    } catch (error) {
      console.error("Network error during user creation:", error);
      toast.error("Network error", {
        description: "Could not connect to the server. Please check your connection.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mobile-container mobile-section space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <BackButton fallbackHref="/admin/users" variant="ghost" className="-ml-2 hover:bg-slate-200 w-fit" label="Back to Users" />

        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-[#224794] flex items-center justify-center flex-shrink-0">
            <UserPlus className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Create New User</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Add a new user to the Dastaan portal
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
              <Shield className="h-5 w-5 text-[#224794]" />
              User Information
            </CardTitle>
            <CardDescription>
              Enter the details for the new user. All fields marked with * are required.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Personal Information Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                  Personal Information
                </h3>

                {/* Name Field */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-500" />
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    {...register("name")}
                    placeholder="e.g., Ahmed Khan"
                    className={`touch-target ${errors.name ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  />
                  {errors.name && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-500" />
                    Email Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email")}
                    placeholder="user@geo.com"
                    className={`touch-target ${errors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  />
                  {errors.email && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      {errors.email.message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Must be a valid @geo.com email address
                  </p>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                    <Lock className="h-4 w-4 text-slate-500" />
                    Password <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    {...register("password")}
                    placeholder="Minimum 8 characters"
                    className={`touch-target ${errors.password ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  />
                  {errors.password && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      {errors.password.message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Password will be sent to the user via email
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t pt-6" />

              {/* Work Information Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                  Work Information
                </h3>

                {/* Position Field */}
                <div className="space-y-2">
                  <Label htmlFor="position" className="text-sm font-medium flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-slate-500" />
                    Position/Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="position"
                    {...register("position")}
                    placeholder="e.g., Senior Content Manager"
                    className={`touch-target ${errors.position ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  />
                  {errors.position && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      {errors.position.message}
                    </p>
                  )}
                </div>

                {/* Department Field */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-slate-500" />
                    Department <span className="text-red-500">*</span>
                  </Label>
                  <Controller
                    control={control}
                    name="department"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger className={`touch-target ${errors.department ? 'border-red-500' : ''}`}>
                          <SelectValue placeholder="Select a department" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="evaluator">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-yellow-500" />
                              Evaluator
                            </div>
                          </SelectItem>
                          <SelectItem value="management">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-orange-500" />
                              Management
                            </div>
                          </SelectItem>
                          <SelectItem value="content_team">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-blue-500" />
                              Content Team
                            </div>
                          </SelectItem>
                          <SelectItem value="gcm">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-teal-500" />
                              GCM
                            </div>
                          </SelectItem>
                          <SelectItem value="programming_team">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-purple-500" />
                              Programming Team
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.department && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      {errors.department.message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    The department determines the user's role and access permissions
                  </p>
                </div>

                {/* Team Field */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-500" />
                    Team <span className="text-slate-400">(Optional)</span>
                  </Label>
                  <Controller
                    control={control}
                    name="team_id"
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={teamsLoading || watch("department") === "gcm"}
                      >
                        <SelectTrigger className={`touch-target ${errors.team_id ? 'border-red-500' : ''} ${(watch("department") === "gcm") ? 'opacity-50 cursor-not-allowed' : ''}`}>
                          <SelectValue placeholder={
                            watch("department") === "gcm"
                              ? "GCM users auto-assigned to shared team"
                              : (teamsLoading ? "Loading teams..." : "Select a team (optional)")
                          } />
                        </SelectTrigger>
                        <SelectContent>
                          {watch("department") === "gcm" ? (
                            <div className="px-2 py-3 text-sm text-muted-foreground">
                              GCM users are automatically assigned to the shared GCM team
                            </div>
                          ) : (
                            teams.length === 0 && !teamsLoading ? (
                              <div className="px-2 py-3 text-sm text-muted-foreground">
                                No teams available. Create teams first.
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
                                    {formatTeamName(team)}
                                  </div>
                                </SelectItem>
                              ))
                            )
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.team_id && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      {errors.team_id.message}
                    </p>
                  )}
                  {watch("department") === "gcm" ? (
                    <p className="text-xs text-muted-foreground">
                      GCM users are automatically assigned to the shared GCM team for proper isolation
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Assign the user to a team for performance tracking
                    </p>
                  )}
                </div>
              </div>

              {/* Team Isolation Notice */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <Users className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-amber-900">Team Isolation</p>
                    <p className="text-xs text-amber-700">
                      Users can only see data from their own team. Content heads automatically
                      get a team created for them. Management and admin roles have global access
                      across all teams.
                    </p>
                  </div>
                </div>
              </div>

              {/* Security Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-blue-900">Security Notice</p>
                    <p className="text-xs text-blue-700">
                      User accounts are created with the email and password you provide.
                      Make sure to securely share credentials with the new user. All admin actions are logged for audit purposes.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/admin/users")}
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
                      Creating User...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Create User
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
