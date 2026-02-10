"use client";

import { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface DirectorSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label?: string;
}

export function DirectorSelect({
  value,
  onChange,
  disabled = false,
  label = "Director",
}: DirectorSelectProps) {
  const [inputValue, setInputValue] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [directors, setDirectors] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Fetch directors from database
  useEffect(() => {
    fetchDirectors();
  }, []);

  const fetchDirectors = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("directors")
        .select("id, name")
        .eq("status", "active")
        .order("name");

      if (error) throw error;
      setDirectors(data || []);
    } catch (error) {
      console.error("Error fetching directors:", error);
      toast.error("Failed to load directors");
    } finally {
      setLoading(false);
    }
  };

  // Filter directors based on input
  const filteredDirectors = directors.filter((director) =>
    director.name.toLowerCase().includes(inputValue.toLowerCase())
  );

  // Options include filtered directors + "Add New Director"
  const options = [
    ...filteredDirectors,
    ...(inputValue.trim()
      ? [{ id: "__add_new__", name: `+ Add "${inputValue.trim()}" as new director`, isAddNew: true }]
      : []),
  ];

  // Select a director
  const selectDirector = async (option: { id: string; name: string; isAddNew?: boolean }) => {
    if (option.isAddNew) {
      // Add new director to database
      const newName = inputValue.trim();
      try {
        const { data, error } = await supabase
          .from("directors")
          .insert({ name: newName })
          .select("id, name")
          .single();

        if (error) throw error;
        await fetchDirectors();
        onChange(data.name);
        setInputValue("");
        setShowDropdown(false);
        toast.success(`Director "${newName}" added`);
      } catch (error: any) {
        if (error?.code === "23505") {
          toast.error("Director already exists");
        } else {
          console.error("Error adding director:", error);
          toast.error("Failed to add director");
        }
      }
      return;
    }

    onChange(option.name);
    setInputValue("");
    setShowDropdown(false);
    setHighlightedIndex(0);
  };

  // Clear selection
  const clearSelection = () => {
    onChange("");
    setInputValue("");
    inputRef.current?.focus();
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
          selectDirector(options[highlightedIndex]);
        }
      } else if (e.key === "Escape") {
        setShowDropdown(false);
        setHighlightedIndex(0);
      }
    }

    // Handle backspace to clear selection
    if (e.key === "Backspace" && inputValue === "" && value) {
      clearSelection();
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
        <Label htmlFor="director-select">{label}</Label>
      )}

      {/* Selected director as badge */}
      {value && (
        <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-slate-50 min-h-[42px]">
          <Badge
            variant="secondary"
            className="text-sm px-3 py-1 flex items-center gap-1.5"
          >
            {value}
            {!disabled && (
              <button
                type="button"
                onClick={clearSelection}
                className="hover:bg-slate-300 rounded-full p-0.5"
                aria-label={`Remove ${value}`}
                title="Remove director"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        </div>
      )}

      {/* Input field with dropdown */}
      <div className="relative">
        <div className="relative">
          <Input
            ref={inputRef}
            id="director-select"
            type="text"
            placeholder="Search directors or add new..."
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
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          )}
        </div>

        {/* Dropdown */}
        {showDropdown && options.length > 0 && !disabled && !loading && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto"
          >
            {options.map((option, index) => {
              const isAddNew = "isAddNew" in option && option.isAddNew;
              return (
                <div
                  key={option.id}
                  onClick={() => selectDirector(option)}
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
    </div>
  );
}
