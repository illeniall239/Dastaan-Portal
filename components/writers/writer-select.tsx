"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AddWriterDialog } from "./add-writer-dialog";
import type { Writer } from "@/types";
import { toast } from "sonner";

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
  const [writers, setWriters] = useState<Writer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch writers on mount
  useEffect(() => {
    fetchWriters();
  }, []);

  const fetchWriters = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/writers");
      if (!response.ok) {
        throw new Error("Failed to fetch writers");
      }
      const data = await response.json();
      setWriters(data);
    } catch (error) {
      console.error("Error fetching writers:", error);
      toast.error("Failed to load writers");
    } finally {
      setIsLoading(false);
    }
  };

  const handleWriterAdded = (newWriter: Writer) => {
    // Add new writer to the list
    setWriters((prev) => [...prev, newWriter].sort((a, b) => a.name.localeCompare(b.name)));
    // Automatically select the newly added writer
    onChange(newWriter.id, newWriter);
  };

  const handleValueChange = (writerId: string) => {
    if (writerId === "__add_new__") {
      setIsDialogOpen(true);
    } else {
      const selectedWriter = writers.find((w) => w.id === writerId);
      onChange(writerId, selectedWriter);
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
          <SelectValue placeholder={isLoading ? "Loading writers..." : placeholder} />
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
