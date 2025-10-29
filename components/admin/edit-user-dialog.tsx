"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const editUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  position: z.string().optional(),
});

type EditUserFormData = z.infer<typeof editUserSchema>;

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  currentData: {
    name: string;
    email: string;
    position?: string | null;
  };
  onSuccess: () => void;
}

export function EditUserDialog({
  open,
  onOpenChange,
  userId,
  currentData,
  onSuccess,
}: EditUserDialogProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      name: currentData.name,
      email: currentData.email,
      position: currentData.position || "",
    },
  });

  // Reset form when dialog opens with new data
  useEffect(() => {
    if (open) {
      reset({
        name: currentData.name,
        email: currentData.email,
        position: currentData.position || "",
      });
    }
  }, [open, currentData, reset]);

  const onSubmit = async (data: EditUserFormData) => {
    if (!isDirty) {
      toast.info("No changes made");
      onOpenChange(false);
      return;
    }

    setIsUpdating(true);

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMessage = typeof result.error === 'string'
          ? result.error
          : "Failed to update user";
        toast.error("Update failed", {
          description: errorMessage,
        });
        return;
      }

      toast.success("User updated successfully", {
        description: "User information has been updated",
      });

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Update error:", error);
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
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user information
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              {...register("name")}
              disabled={isUpdating}
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              disabled={isUpdating}
              className={errors.email ? "border-red-500" : ""}
            />
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          {/* Position Field */}
          <div className="space-y-2">
            <Label htmlFor="position">Position</Label>
            <Input
              id="position"
              {...register("position")}
              disabled={isUpdating}
              placeholder="e.g., Senior Writer, Associate"
            />
            {errors.position && (
              <p className="text-sm text-red-600">{errors.position.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdating || !isDirty}>
              {isUpdating ? "Updating..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
