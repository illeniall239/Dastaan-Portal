"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
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

// Validation schema for new genre
const createGenreSchema = z.object({
  name: z.string().min(1, "Genre name is required").max(100, "Genre name too long"),
});

type CreateGenreInput = z.infer<typeof createGenreSchema>;

interface Genre {
  id: string;
  name: string;
  is_predefined?: boolean;
}

interface AddGenreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenreAdded: (genre: Genre) => void;
  initialName?: string;
}

export function AddGenreDialog({
  open,
  onOpenChange,
  onGenreAdded,
  initialName = "",
}: AddGenreDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateGenreInput>({
    resolver: zodResolver(createGenreSchema),
    mode: "onBlur",
  });

  // Pre-fill name when dialog opens with initialName
  useEffect(() => {
    if (open && initialName) {
      reset({ name: initialName });
    }
  }, [open, initialName, reset]);

  const onSubmit = async (data: CreateGenreInput) => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/genres", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        // If genre already exists, still add it to the selection
        if (response.status === 409 && result.genre) {
          toast.info(`Genre "${result.genre.name}" already exists - added to selection`);
          onGenreAdded(result.genre);
          reset();
          onOpenChange(false);
          return;
        }

        toast.error(result.error || "Failed to add genre");
        return;
      }

      toast.success(`Genre "${result.genre.name}" created successfully!`);
      onGenreAdded(result.genre);
      reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding genre:", error);
      toast.error("An error occurred while adding the genre");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      reset();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Genre</DialogTitle>
          <DialogDescription>
            Add a new custom genre to the database. It will be available for all users.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Genre Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Psychological Thriller"
              {...register("name")}
              disabled={isLoading}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Genre"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
