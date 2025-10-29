"use client";

import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface ChangeRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  currentRole: string;
  onSuccess: () => void;
}

export function ChangeRoleDialog({
  open,
  onOpenChange,
  userId,
  userName,
  currentRole,
  onSuccess,
}: ChangeRoleDialogProps) {
  const [selectedRole, setSelectedRole] = useState(currentRole);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSave = async () => {
    if (selectedRole === currentRole) {
      toast.info("No changes made", {
        description: "The role is the same as before",
      });
      onOpenChange(false);
      return;
    }

    setIsUpdating(true);

    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: selectedRole }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = typeof data.error === 'string'
          ? data.error
          : "Failed to update user role";
        toast.error("Role update failed", {
          description: errorMessage,
        });
        return;
      }

      toast.success("Role updated successfully", {
        description: `${userName}'s role has been changed to ${selectedRole}`,
      });

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Role update error:", error);
      toast.error("An error occurred", {
        description: "Please try again later",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change User Role</DialogTitle>
          <DialogDescription>
            Update the role for <strong>{userName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Current Role</Label>
            <div className="px-3 py-2 bg-muted rounded-md text-sm">
              {currentRole}
            </div>
          </div>

          <div className="space-y-2">
            <Label>New Role</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select new role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="production_content_1">Production Content 1</SelectItem>
                <SelectItem value="production_content_2">Production Content 2</SelectItem>
                <SelectItem value="channel_content_1">Channel Content 1</SelectItem>
                <SelectItem value="channel_content_2">Channel Content 2</SelectItem>
                <SelectItem value="adaptation_content">Adaptation Content</SelectItem>
                <SelectItem value="management">Management</SelectItem>
                <SelectItem value="evaluator">Evaluator</SelectItem>
                <SelectItem value="legal">Legal Department</SelectItem>
                <SelectItem value="finance">Finance Department</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUpdating}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isUpdating}>
            {isUpdating ? "Updating..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
