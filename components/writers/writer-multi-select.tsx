"use client";

import { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Plus, Pencil, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Writer, CallReportWriter } from "@/types";
import { WriterContactModal } from "./writer-contact-modal";

interface WriterMultiSelectProps {
  value: Array<{
    writer_id: string;
    writer_name: string;
    writer_email?: string;
    writer_phone?: string;
    display_order: number;
  }>;
  onChange: (writers: Array<{
    writer_id: string;
    writer_name: string;
    writer_email?: string;
    writer_phone?: string;
    display_order: number;
  }>) => void;
  required?: boolean;
  disabled?: boolean;
  label?: string;
}

export function WriterMultiSelect({
  value,
  onChange,
  required = false,
  disabled = false,
  label = "Writers/Originators",
}: WriterMultiSelectProps) {
  const [inputValue, setInputValue] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [writers, setWriters] = useState<Writer[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Contact modal state
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [editingWriter, setEditingWriter] = useState<{
    id: string;
    name: string;
    email?: string;
    phone?: string;
  } | null>(null);

  // Fetch writers from database
  useEffect(() => {
    fetchWriters();
  }, []);

  const fetchWriters = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("writers")
        .select("*")
        .eq("status", "active")
        .order("name");

      if (error) throw error;
      setWriters(data || []);
    } catch (error) {
      console.error("Error fetching writers:", error);
      toast.error("Failed to load writers");
    } finally {
      setLoading(false);
    }
  };

  // Filter writers based on input and exclude already selected
  const selectedWriterIds = value.map(w => w.writer_id);
  const filteredWriters = writers.filter(
    (writer) =>
      writer.name.toLowerCase().includes(inputValue.toLowerCase()) &&
      !selectedWriterIds.includes(writer.id)
  );

  // Options include filtered writers + "Add New Writer"
  const options = [
    ...filteredWriters,
    ...(inputValue.trim() ? [{ id: "__add_new__", name: `+ Add "${inputValue.trim()}" as new writer`, isAddNew: true }] : [])
  ];

  // Add writer to selection
  const addWriter = async (writer: Writer | { id: string; name: string; isAddNew?: boolean }) => {
    if ('isAddNew' in writer && writer.isAddNew) {
      const newName = inputValue.trim();
      try {
        const { data, error } = await supabase
          .from("writers")
          .insert({ name: newName })
          .select("id, name")
          .single();

        if (error) {
          if (error.code === "23505") {
            toast.error("Writer already exists");
          } else {
            throw error;
          }
          return;
        }

        await fetchWriters();
        const addedWriter = {
          writer_id: data.id,
          writer_name: data.name,
          writer_email: undefined,
          writer_phone: undefined,
          display_order: value.length,
        };
        onChange([...value, addedWriter]);
        toast.success(`Writer "${newName}" added`);
      } catch (error) {
        console.error("Error adding writer:", error);
        toast.error("Failed to add writer");
      }
      setInputValue("");
      setShowDropdown(false);
      setHighlightedIndex(0);
      return;
    }

    const newWriter = {
      writer_id: writer.id,
      writer_name: writer.name,
      writer_email: undefined,
      writer_phone: undefined,
      display_order: value.length,
    };

    onChange([...value, newWriter]);
    setInputValue("");
    setShowDropdown(false);
    setHighlightedIndex(0);
  };

  // Remove writer from selection
  const removeWriter = (writerId: string) => {
    const filtered = value.filter((w) => w.writer_id !== writerId);
    // Reorder remaining writers
    const reordered = filtered.map((w, index) => ({ ...w, display_order: index }));
    onChange(reordered);
  };

  // Open contact modal for a writer
  const openContactModal = (writerId: string) => {
    const writer = value.find(w => w.writer_id === writerId);
    if (writer) {
      setEditingWriter({
        id: writer.writer_id,
        name: writer.writer_name,
        email: writer.writer_email,
        phone: writer.writer_phone,
      });
      setContactModalOpen(true);
    }
  };

  // Save contact info for a writer
  const saveContactInfo = (email: string | undefined, phone: string | undefined) => {
    if (!editingWriter) return;

    const updated = value.map(w =>
      w.writer_id === editingWriter.id
        ? { ...w, writer_email: email, writer_phone: phone }
        : w
    );
    onChange(updated);
    setEditingWriter(null);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown && options.length > 0) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        setShowDropdown(true);
      }
    }

    if (showDropdown && options.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < options.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : options.length - 1
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (options[highlightedIndex]) {
          addWriter(options[highlightedIndex] as Writer);
        }
      } else if (e.key === "Escape") {
        setShowDropdown(false);
        setHighlightedIndex(0);
      }
    }

    // Handle backspace to remove last writer
    if (e.key === "Backspace" && inputValue === "" && value.length > 0) {
      removeWriter(value[value.length - 1].writer_id);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor="writer-multi-select">
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
      )}

      {/* Selected writers as badges */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-slate-50 min-h-[42px]">
          {value
            .sort((a, b) => a.display_order - b.display_order)
            .map((writer) => (
              <Badge
                key={writer.writer_id}
                variant="secondary"
                className="text-sm px-3 py-1 flex items-center gap-1.5"
              >
                {writer.writer_name}
                {!disabled && (
                  <>
                    <button
                      type="button"
                      onClick={() => openContactModal(writer.writer_id)}
                      className="hover:bg-slate-300 rounded-full p-0.5"
                      aria-label={`Edit contact info for ${writer.writer_name}`}
                      title="Edit contact information"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeWriter(writer.writer_id)}
                      className="hover:bg-slate-300 rounded-full p-0.5"
                      aria-label={`Remove ${writer.writer_name}`}
                      title="Remove writer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </>
                )}
              </Badge>
            ))}
        </div>
      )}

      {/* Input field with dropdown */}
      <div className="relative">
        <div className="relative">
          <Input
            ref={inputRef}
            id="writer-multi-select"
            type="text"
            placeholder="Search writers or add new..."
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowDropdown(true);
              setHighlightedIndex(0);
            }}
            onFocus={() => setShowDropdown(true)}
            onKeyDown={handleKeyDown}
            disabled={disabled || loading}
            className="pr-10"
          />
          {loading ? (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <Plus className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          )}
        </div>

        {/* Dropdown */}
        {showDropdown && options.length > 0 && !disabled && !loading && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto"
          >
            {options.map((option, index) => {
              const isAddNew = 'isAddNew' in option && option.isAddNew;
              return (
                <div
                  key={option.id}
                  onClick={() => addWriter(option as Writer)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={cn(
                    "px-4 py-2 cursor-pointer text-sm",
                    highlightedIndex === index
                      ? "bg-blue-50 text-blue-700"
                      : "hover:bg-slate-50",
                    isAddNew && "font-medium text-blue-600 border-t"
                  )}
                >
                  {option.name}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Contact Info Modal */}
      {editingWriter && (
        <WriterContactModal
          isOpen={contactModalOpen}
          onClose={() => {
            setContactModalOpen(false);
            setEditingWriter(null);
          }}
          writer={editingWriter}
          onSave={saveContactInfo}
        />
      )}

    </div>
  );
}
