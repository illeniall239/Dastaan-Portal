"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { EditUserDialog } from "@/components/admin/edit-user-dialog";
import { ChangeRoleDialog } from "@/components/admin/change-role-dialog";
import { DeleteUserDialog } from "@/components/admin/delete-user-dialog";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { Search, UserPlus, Loader2, User, Users, Mail, Briefcase, Shield, Calendar } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

interface User {
  id: string;
  name: string;
  email: string;
  position: string | null;
  role: string;
  department: string | null;
  status: string;
  created_at: string;
  team_id?: string;
  team?: {
    id: string;
    name: string;
    team_head?: {
      name: string;
    };
  };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const pageSize = 50; // Show 50 users per page

  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const supabase = createClient();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      // Get total count
      const { count } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true });

      setTotalUsers(count || 0);

      // Fetch paginated users
      const offset = (currentPage - 1) * pageSize;
      const { data, error } = await supabase
        .from("users")
        .select(`
          id,
          name,
          email,
          position,
          role,
          department,
          status,
          created_at,
          team_id,
          team:teams!team_id(
            id,
            name,
            team_head:users!team_head_id(
              name
            )
          )
        `)
        .order("created_at", { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (error) {
        toast.error("Failed to load users", {
          description: error.message,
        });
        return;
      }

      interface TeamHead {
        name: string;
      }

      interface TeamData {
        id: string;
        name: string;
        team_head?: TeamHead | TeamHead[];
      }

      interface UserData {
        id: string;
        name: string;
        email: string;
        position: string | null;
        role: string;
        department: string | null;
        status: string;
        created_at: string;
        team_id?: string;
        team?: TeamData | TeamData[];
      }

      // Transform the data to match User type (team and team_head should be objects, not arrays)
      const transformedData = (data || []).map((user: UserData) => {
        const team = Array.isArray(user.team) ? user.team[0] : user.team;
        return {
          ...user,
          team: team ? {
            ...team,
            team_head: Array.isArray(team.team_head) ? team.team_head[0] : team.team_head,
          } : undefined,
        };
      });

      setUsers(transformedData);
    } catch (error) {
      logger.error("Error fetching users:", error);
      toast.error("An error occurred while loading users");
    } finally {
      setLoading(false);
    }
  }, [supabase, currentPage, pageSize]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Filter users based on search using useMemo (more efficient than useEffect + separate state)
  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;

    const lowerSearch = searchTerm.toLowerCase();
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(lowerSearch) ||
        user.email.toLowerCase().includes(lowerSearch) ||
        user.role?.toLowerCase().includes(lowerSearch)
    );
  }, [searchTerm, users]);

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";

    try {
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      toast.success("Status updated", {
        description: `User is now ${newStatus}`,
      });

      fetchUsers();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: "bg-red-100 text-red-800 border-red-300",
      management: "bg-purple-100 text-purple-800 border-purple-300",
      content_creator: "bg-blue-100 text-blue-800 border-blue-300",
      evaluator: "bg-green-100 text-green-800 border-green-300",
      legal: "bg-yellow-100 text-yellow-800 border-yellow-300",
      finance: "bg-orange-100 text-orange-800 border-orange-300",
      programmer: "bg-indigo-100 text-indigo-800 border-indigo-300",
    };
    return colors[role] || "bg-gray-100 text-gray-800 border-gray-300";
  };

  return (
    <div className="mobile-container mobile-section">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3 sm:gap-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">User Management</h2>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Manage user accounts and permissions
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto touch-target bg-[#10b981] hover:bg-[#059669]">
          <Link href="/admin/users/new">
            <UserPlus className="h-4 w-4 mr-2" />
            Create User
          </Link>
        </Button>
      </div>

      {/* Search Bar */}
      <div className="mb-4 sm:mb-6">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 touch-target"
            disabled={loading}
          />
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground mt-2">
          {loading ? (
            <span className="animate-pulse">Loading users...</span>
          ) : (
            <>
              Showing {filteredUsers.length} of {totalUsers} users
              {searchTerm && ` (filtered from ${totalUsers} total)`}
            </>
          )}
        </p>
      </div>

      {loading && (
        /* Loading skeleton */
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center space-x-4 animate-pulse">
                <div className="h-10 w-10 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                </div>
                <div className="h-6 w-20 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Users Table */}
      {!loading && (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <ResponsiveTable
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'email', label: 'Email' },
            { key: 'position', label: 'Position' },
            { key: 'role', label: 'Role' },
            { key: 'team', label: 'Team' },
            { key: 'status', label: 'Status' },
            { key: 'joined', label: 'Joined' },
            { key: 'actions', label: 'Actions' },
          ]}
          data={filteredUsers}
          renderRow={(user) => (
            <>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="font-medium text-gray-900">{user.name}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-600">{user.email}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-600">
                  {user.position || "-"}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Badge
                  variant="outline"
                  className={getRoleBadgeColor(user.role)}
                >
                  {user.role || "No Role"}
                </Badge>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {user.team ? (
                  <Badge
                    variant="outline"
                    className="bg-blue-100 text-blue-800 border-blue-300"
                  >
                    {user.team.team_head?.name
                      ? `${user.team.team_head.name}'s Team`
                      : user.team.name
                    }
                  </Badge>
                ) : (
                  <span className="text-sm text-gray-400">-</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Badge
                  variant={user.status === "active" ? "default" : "secondary"}
                  className={
                    user.status === "active"
                      ? "bg-green-100 text-green-800 border-green-300"
                      : "bg-gray-100 text-gray-800 border-gray-300"
                  }
                >
                  {user.status}
                </Badge>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                {formatDate(user.created_at)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedUser(user);
                    setRoleDialogOpen(true);
                  }}
                >
                  Change Role
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedUser(user);
                    setEditDialogOpen(true);
                  }}
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleStatus(user.id, user.status)}
                >
                  {user.status === "active" ? "Deactivate" : "Activate"}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setSelectedUser(user);
                    setDeleteDialogOpen(true);
                  }}
                >
                  Delete
                </Button>
              </td>
            </>
          )}
          renderMobileCard={(user) => (
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                {/* User Name and Status */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base">{user.name}</h3>
                      <Badge
                        variant={user.status === "active" ? "default" : "secondary"}
                        className={`mt-1 text-xs ${
                          user.status === "active"
                            ? "bg-green-100 text-green-800 border-green-300"
                            : "bg-gray-100 text-gray-800 border-gray-300"
                        }`}
                      >
                        {user.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* User Details */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground truncate">{user.email}</span>
                  </div>
                  {user.position && (
                    <div className="flex items-center gap-2 text-sm">
                      <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">{user.position}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                    <Badge
                      variant="outline"
                      className={`${getRoleBadgeColor(user.role)} text-xs`}
                    >
                      {user.role || "No Role"}
                    </Badge>
                  </div>
                  {user.team && (
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <Badge
                        variant="outline"
                        className="bg-blue-100 text-blue-800 border-blue-300 text-xs"
                      >
                        {user.team.team_head?.name
                          ? `${user.team.team_head.name}'s Team`
                          : user.team.name
                        }
                      </Badge>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground text-xs">
                      Joined {formatDate(user.created_at)}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="touch-target"
                    onClick={() => {
                      setSelectedUser(user);
                      setRoleDialogOpen(true);
                    }}
                  >
                    Change Role
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="touch-target"
                    onClick={() => {
                      setSelectedUser(user);
                      setEditDialogOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="touch-target"
                    onClick={() => handleToggleStatus(user.id, user.status)}
                  >
                    {user.status === "active" ? "Deactivate" : "Activate"}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="touch-target"
                    onClick={() => {
                      setSelectedUser(user);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          emptyMessage="No users found"
        />
      </div>
      )}

      {/* Pagination Controls */}
      {!loading && !searchTerm && Math.ceil(totalUsers / pageSize) > 1 && (
        <div className="flex items-center justify-between px-2 py-4">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {Math.ceil(totalUsers / pageSize)}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="touch-target"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalUsers / pageSize), prev + 1))}
              disabled={currentPage === Math.ceil(totalUsers / pageSize)}
              className="touch-target"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      {selectedUser && (
        <>
          <EditUserDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            userId={selectedUser.id}
            currentData={{
              name: selectedUser.name,
              email: selectedUser.email,
              position: selectedUser.position,
            }}
            onSuccess={fetchUsers}
          />

          <ChangeRoleDialog
            open={roleDialogOpen}
            onOpenChange={setRoleDialogOpen}
            userId={selectedUser.id}
            userName={selectedUser.name}
            currentRole={selectedUser.role}
            onSuccess={fetchUsers}
          />

          <DeleteUserDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            userId={selectedUser.id}
            userName={selectedUser.name}
            userEmail={selectedUser.email}
            onSuccess={fetchUsers}
          />
        </>
      )}
    </div>
  );
}
