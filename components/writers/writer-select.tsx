"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { AddWriterDialog } from "./add-writer-dialog";
import type { Writer } from "@/types";
import { useWriters } from "@/lib/hooks";

interface WriterSelectProps {
  value?: string;
  onChange: (writerId: string, writer: Writer | undefined) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
}

export function WriterSelect({
  value,
  onChange,
  disabled = false,
  required = false,
  placeholder = "Select a writer",
}: WriterSelectProps) {
  const { data: writers = [], isLoading, refetch } = useWriters();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleWriterAdded = (newWriter: Writer) => {
    // Refetch to ensure the new writer is in our list (though invalidation should handle it)
    refetch();
    // Automatically select the newly added writer
    // Note: Since useWriters filters/sorts, we might need to wait for refetch.
    // However, for immediate feedback we can rely on the ID.
    onChange(newWriter.id, newWriter);
  };

  const handleValueChange = (writerId: string) => {
    if (writerId === "__add_new__") {
      setIsDialogOpen(true);
    } else {
      const selectedWriter = writers.find((w) => w.id === writerId);
      onChange(writerId, selectedWriter || undefined); // Ensure undefined is passed if not found
    }
  };

  return (
    <>
      <Select
        value={value}
        onValueChange={handleValueChange}
        disabled={disabled || isLoading}
        required={required}
      >
        <SelectTrigger>
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-muted-foreground">Loading...</span>
            </div>
          ) : (
            <SelectValue placeholder={placeholder} />
          )}
        </SelectTrigger>
        <SelectContent className="max-h-[300px] overflow-y-auto">
          {writers.map((writer) => (
            <SelectItem key={writer.id} value={writer.id}>
              {writer.name}
              {writer.email && ` (${writer.email})`}
            </SelectItem>
          ))}

          {/* Add New Writer Option */}
          <SelectItem
            value="__add_new__"
            className="border-t border-slate-200 mt-2 pt-2 bg-blue-50 hover:bg-blue-100 font-medium text-blue-700"
          >
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span>Add New Writer</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      <AddWriterDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onWriterAdded={handleWriterAdded}
      />
    </>
  );
}
