"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { Search, Loader2, User, Mail, Briefcase, Shield, UserPlus, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { BackButton } from "@/components/ui/back-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
  position: string | null;
  status: string;
  created_at: string;
}

interface Team {
  id: string;
  name: string;
}

interface AvailableUser {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
  status: string;
}

export default function TeamMembersPage() {
  const params = useParams();
  const teamId = params?.id as string;
  const router = useRouter();

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());

  // Add members dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [selectedUsersToAdd, setSelectedUsersToAdd] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);

  // Remove members state
  const [removing, setRemoving] = useState(false);

  const fetchTeamMembers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/teams/${teamId}/members`);

      if (!response.ok) {
        throw new Error("Failed to load team members");
      }

      const data = await response.json();
      setTeam(data.team);
      setMembers(data.members || []);
    } catch (error) {
      logger.error("Error fetching team members:", error);
      toast.error("Failed to load team members");
      router.push("/admin/teams");
    } finally {
      setLoading(false);
    }
  }, [teamId, router]);

  useEffect(() => {
    if (teamId) {
      fetchTeamMembers();
    }
  }, [teamId, fetchTeamMembers]);

  // Filter members based on search
  const filteredMembers = useMemo(() => {
    if (!searchTerm) return members;

    const lowerSearch = searchTerm.toLowerCase();
    return members.filter(
      (member) =>
        member.name.toLowerCase().includes(lowerSearch) ||
        member.email.toLowerCase().includes(lowerSearch) ||
        member.role?.toLowerCase().includes(lowerSearch)
    );
  }, [searchTerm, members]);

  // Handle select all checkbox
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedMembers(new Set(filteredMembers.map(m => m.id)));
    } else {
      setSelectedMembers(new Set());
    }
  };

  // Handle individual checkbox
  const handleSelectMember = (memberId: string, checked: boolean) => {
    const newSelected = new Set(selectedMembers);
    if (checked) {
      newSelected.add(memberId);
    } else {
      newSelected.delete(memberId);
    }
    setSelectedMembers(newSelected);
  };

  // Fetch available users when opening add dialog
  const handleOpenAddDialog = async () => {
    setAddDialogOpen(true);
    try {
      const response = await fetch("/api/admin/users");
      if (!response.ok) throw new Error("Failed to fetch users");

      const data = await response.json();
      // Filter out users already in this team
      const currentMemberIds = new Set(members.map(m => m.id));
      const available = (data.users || []).filter((user: AvailableUser) =>
        !currentMemberIds.has(user.id) && user.status === 'active'
      );
      setAvailableUsers(available);
    } catch (error) {
      logger.error("Error fetching available users:", error);
      toast.error("Failed to load available users");
    }
  };

  // Add members to team
  const handleAddMembers = async () => {
    if (selectedUsersToAdd.length === 0) {
      toast.error("Please select at least one user");
      return;
    }

    setAdding(true);
    try {
      const response = await fetch(`/api/admin/teams/${teamId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_ids: selectedUsersToAdd }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to add members");
      }

      toast.success("Members added successfully", {
        description: `${selectedUsersToAdd.length} user(s) added to ${team?.name}`,
      });

      setAddDialogOpen(false);
      setSelectedUsersToAdd([]);
      fetchTeamMembers();
    } catch (error) {
      logger.error("Error adding members:", error);
      toast.error("Failed to add members", {
        description: error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setAdding(false);
    }
  };

  // Remove members from team
  const handleRemoveMembers = async () => {
    if (selectedMembers.size === 0) {
      toast.error("Please select at least one member to remove");
      return;
    }

    setRemoving(true);
    try {
      const response = await fetch(`/api/admin/teams/${teamId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_ids: Array.from(selectedMembers) }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to remove members");
      }

      toast.success("Members removed successfully", {
        description: `${selectedMembers.size} user(s) removed from ${team?.name}`,
      });

      setSelectedMembers(new Set());
      fetchTeamMembers();
    } catch (error) {
      logger.error("Error removing members:", error);
      toast.error("Failed to remove members", {
        description: error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setRemoving(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: "bg-red-100 text-red-800 border-red-300",
      management: "bg-purple-100 text-purple-800 border-purple-300",
      content_creator: "bg-blue-100 text-blue-800 border-blue-300",
      evaluator: "bg-green-100 text-green-800 border-green-300",
      legal: "bg-yellow-100 text-yellow-800 border-yellow-300",
      finance: "bg-orange-100 text-orange-800 border-orange-300",
    };
    return colors[role] || "bg-gray-100 text-gray-800 border-gray-300";
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
      <div className="flex flex-col gap-4 mb-6">
        <BackButton fallbackHref="/admin/teams" variant="ghost" className="-ml-2 hover:bg-slate-200 w-fit" label="Back to Teams" />

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{team?.name} - Members</h2>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Manage team members and assignments
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            {selectedMembers.size > 0 && (
              <Button
                variant="destructive"
                onClick={handleRemoveMembers}
                disabled={removing}
                className="touch-target flex-1 sm:flex-initial"
              >
                {removing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Removing...
                  </>
                ) : (
                  <>
                    <UserMinus className="h-4 w-4 mr-2" />
                    Remove ({selectedMembers.size})
                  </>
                )}
              </Button>
            )}
            <Button
              onClick={handleOpenAddDialog}
              className="touch-target bg-[#10b981] hover:bg-[#059669] flex-1 sm:flex-initial"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Members
            </Button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-4 sm:mb-6">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 touch-target"
          />
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground mt-2">
          Showing {filteredMembers.length} of {members.length} members
          {selectedMembers.size > 0 && ` (${selectedMembers.size} selected)`}
        </p>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <ResponsiveTable
          columns={[
            {
              key: 'select',
              label: '',
            },
            { key: 'name', label: 'Name' },
            { key: 'email', label: 'Email' },
            { key: 'position', label: 'Position' },
            { key: 'role', label: 'Role' },
            { key: 'status', label: 'Status' },
          ]}
          data={filteredMembers}
          renderRow={(member) => (
            <>
              <td className="px-6 py-4 whitespace-nowrap">
                <Checkbox
                  checked={selectedMembers.has(member.id)}
                  onCheckedChange={(checked) => handleSelectMember(member.id, !!checked)}
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="font-medium text-gray-900">{member.name}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-600">{member.email}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-600">
                  {member.position || "-"}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Badge
                  variant="outline"
                  className={getRoleBadgeColor(member.role)}
                >
                  {member.role || "No Role"}
                </Badge>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Badge
                  variant={member.status === "active" ? "default" : "secondary"}
                  className={
                    member.status === "active"
                      ? "bg-green-100 text-green-800 border-green-300"
                      : "bg-gray-100 text-gray-800 border-gray-300"
                  }
                >
                  {member.status}
                </Badge>
              </td>
            </>
          )}
          renderMobileCard={(member) => (
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <Checkbox
                    checked={selectedMembers.has(member.id)}
                    onCheckedChange={(checked) => handleSelectMember(member.id, !!checked)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="bg-primary/10 p-2 rounded-full">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-base">{member.name}</h3>
                        <Badge
                          variant={member.status === "active" ? "default" : "secondary"}
                          className={`mt-1 text-xs ${
                            member.status === "active"
                              ? "bg-green-100 text-green-800 border-green-300"
                              : "bg-gray-100 text-gray-800 border-gray-300"
                          }`}
                        >
                          {member.status}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground truncate">{member.email}</span>
                      </div>
                      {member.position && (
                        <div className="flex items-center gap-2 text-sm">
                          <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">{member.position}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm">
                        <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                        <Badge
                          variant="outline"
                          className={`${getRoleBadgeColor(member.role)} text-xs`}
                        >
                          {member.role || "No Role"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          emptyMessage="No members found"
        />
      </div>

      {/* Add Members Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Members to {team?.name}</DialogTitle>
            <DialogDescription>
              Select users to add to this team. Users can only belong to one team at a time.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Users</Label>
              {availableUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">
                  No available users. All active users are already assigned to teams.
                </p>
              ) : (
                <div className="border rounded-md max-h-96 overflow-y-auto">
                  {availableUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 p-3 hover:bg-slate-50 border-b last:border-b-0"
                    >
                      <Checkbox
                        checked={selectedUsersToAdd.includes(user.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedUsersToAdd([...selectedUsersToAdd, user.id]);
                          } else {
                            setSelectedUsersToAdd(selectedUsersToAdd.filter(id => id !== user.id));
                          }
                        }}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                      <Badge variant="outline" className={getRoleBadgeColor(user.role)}>
                        {user.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddDialogOpen(false);
                setSelectedUsersToAdd([]);
              }}
              disabled={adding}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddMembers}
              disabled={adding || selectedUsersToAdd.length === 0}
              className="bg-[#10b981] hover:bg-[#059669]"
            >
              {adding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                `Add ${selectedUsersToAdd.length} Member${selectedUsersToAdd.length !== 1 ? 's' : ''}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
