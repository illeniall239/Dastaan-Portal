"use client";

import { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Plus } from "lucide-react";
import { AddGenreDialog } from "@/components/ui/add-genre-dialog";
import { cn } from "@/lib/utils";

interface Genre {
  id: string;
  name: string;
  is_predefined?: boolean;
}

interface GenreMultiSelectProps {
  selectedGenres: string[];
  onChange: (genres: string[]) => void;
  required?: boolean;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
}

export function GenreMultiSelect({
  selectedGenres,
  onChange,
  required = false,
  disabled = false,
  label = "Genre(s)",
  placeholder = "Search or add genres...",
}: GenreMultiSelectProps) {
  const [inputValue, setInputValue] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [isLoadingGenres, setIsLoadingGenres] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [customGenreName, setCustomGenreName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch genres from database on mount
  useEffect(() => {
    fetchGenres();
  }, []);

  const fetchGenres = async () => {
    setIsLoadingGenres(true);
    try {
      const response = await fetch("/api/genres");
      if (response.ok) {
        const data = await response.json();
        setGenres(data.genres || []);
      }
    } catch (error) {
      console.error("Error fetching genres:", error);
    } finally {
      setIsLoadingGenres(false);
    }
  };

  // Filter genres based on input and exclude already selected
  const filteredGenres = genres
    .filter(
      (genre) =>
        genre.name.toLowerCase().includes(inputValue.toLowerCase()) &&
        !selectedGenres.includes(genre.name)
    )
    .map((genre) => genre.name);

  // Check if input value is a new custom genre
  const isCustomGenre =
    inputValue.trim() !== "" &&
    !genres.some((g) => g.name.toLowerCase() === inputValue.trim().toLowerCase()) &&
    !selectedGenres.includes(inputValue.trim());

  // All available options (filtered genres + custom option)
  const options = [
    ...filteredGenres,
    ...(isCustomGenre ? [`Add "${inputValue.trim()}" (custom)`] : []),
  ];

  // Add genre to selection
  const addGenre = (genre: string) => {
    // Handle custom genre display text
    if (genre.startsWith('Add "')) {
      const genreName = genre.replace('Add "', "").replace('" (custom)', "");
      setCustomGenreName(genreName);
      setShowAddDialog(true);
      return;
    }

    if (!selectedGenres.includes(genre)) {
      onChange([...selectedGenres, genre]);
    }
    setInputValue("");
    setShowDropdown(false);
    setHighlightedIndex(0);
  };

  // Handle genre added from dialog
  const handleGenreAdded = (newGenre: Genre) => {
    // Refresh genres list
    fetchGenres();
    // Add to selection
    if (!selectedGenres.includes(newGenre.name)) {
      onChange([...selectedGenres, newGenre.name]);
    }
  };

  // Remove genre from selection
  const removeGenre = (genreToRemove: string) => {
    onChange(selectedGenres.filter((g) => g !== genreToRemove));
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
          addGenre(options[highlightedIndex]);
        }
      } else if (e.key === "Escape") {
        setShowDropdown(false);
        setHighlightedIndex(0);
      }
    }

    // Handle backspace to remove last genre
    if (e.key === "Backspace" && inputValue === "" && selectedGenres.length > 0) {
      removeGenre(selectedGenres[selectedGenres.length - 1]);
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
        <Label htmlFor="genre-multi-select">
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
      )}

      {/* Selected genres as badges */}
      {selectedGenres.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-slate-50 min-h-[42px]">
          {selectedGenres.map((genre) => (
            <Badge
              key={genre}
              variant="secondary"
              className="text-sm px-3 py-1 flex items-center gap-1"
            >
              {genre}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeGenre(genre)}
                  className="hover:bg-slate-300 rounded-full p-0.5 ml-1"
                  aria-label={`Remove ${genre}`}
                >
                  <X className="h-3 w-3" />
                </button>
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
            id="genre-multi-select"
            type="text"
            placeholder={placeholder}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowDropdown(true);
              setHighlightedIndex(0);
            }}
            onFocus={() => setShowDropdown(true)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className="pr-10"
          />
          <Plus className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>

        {/* Dropdown */}
        {showDropdown && options.length > 0 && !disabled && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto"
          >
            {options.map((option, index) => {
              const isCustom = option.startsWith('Add "');
              return (
                <div
                  key={option}
                  onClick={() => addGenre(option)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={cn(
                    "px-4 py-2 cursor-pointer text-sm",
                    highlightedIndex === index
                      ? "bg-blue-50 text-blue-700"
                      : "hover:bg-slate-50",
                    isCustom && "font-medium text-blue-600 border-t"
                  )}
                >
                  {isCustom && (
                    <Plus className="inline-block h-3 w-3 mr-1" />
                  )}
                  {option}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Helper text */}
      <p className="text-xs text-muted-foreground">
        {selectedGenres.length === 0
          ? "Type to search genres or add custom ones"
          : `${selectedGenres.length} genre${selectedGenres.length > 1 ? "s" : ""} selected`}
      </p>

      {/* Add Genre Dialog */}
      <AddGenreDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onGenreAdded={handleGenreAdded}
        initialName={customGenreName}
      />
    </div>
  );
}
