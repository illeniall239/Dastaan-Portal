"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
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
import { createWriterSchema, type CreateWriterInput } from "@/lib/validations/writers";
import type { Writer } from "@/types";

interface AddWriterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWriterAdded: (writer: Writer) => void;
  initialName?: string;
}

export function AddWriterDialog({
  open,
  onOpenChange,
  onWriterAdded,
  initialName = "",
}: AddWriterDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateWriterInput>({
    resolver: zodResolver(createWriterSchema),
    mode: "onBlur",
  });

  // Pre-fill name when dialog opens with initialName
  useEffect(() => {
    if (open && initialName) {
      reset({ name: initialName, email: "", phone: "" });
    }
  }, [open, initialName, reset]);

  const onSubmit = async (data: CreateWriterInput) => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/writers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Failed to add writer");
        return;
      }

      toast.success(`Writer "${result.name}" added successfully!`);
      onWriterAdded(result);
      reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding writer:", error);
      toast.error("An error occurred while adding the writer");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open && !isLoading) {
      reset();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Writer</DialogTitle>
          <DialogDescription>
            Add a new writer to the database. Name is required.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => {
          e.stopPropagation();
          handleSubmit(onSubmit)(e);
        }}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Writer Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Enter writer name"
                {...register("name")}
                disabled={isLoading}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="writer@example.com"
                {...register("email")}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                placeholder="+92 XXX XXXXXXX"
                {...register("phone")}
                disabled={isLoading}
              />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Writer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
