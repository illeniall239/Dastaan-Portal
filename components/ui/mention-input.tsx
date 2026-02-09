"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { UserBadge } from "@/components/ui/user-badge";
import { Loader2 } from "lucide-react";
import { useSearchUsers } from "@/lib/hooks/queries/useSearchUsers";

interface User {
  id: string;
  name: string;
  email: string | null;
  role?: string;
  department?: string;
  type?: 'user' | 'writer';
}

interface MentionInputProps {
  selectedUsers: User[];
  onUsersChange: (users: User[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function MentionInput({
  selectedUsers,
  onUsersChange,
  placeholder = "Type @ to mention users...",
  disabled = false,
  className = "",
}: MentionInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // React Query hook for user search
  const { data: users, isLoading: isSearching } = useSearchUsers({
    query: debouncedQuery,
    enabled: debouncedQuery.length > 0,
  });

  // Filter out already selected users from search results
  const searchResults =
    users?.filter((user) => !selectedUsers.some((selected) => selected.id === user.id)) || [];

  // Extract search query and handle @ mentions
  useEffect(() => {
    const atIndex = inputValue.lastIndexOf("@");

    if (atIndex === -1) {
      setShowDropdown(false);
      setSearchQuery("");
      setDebouncedQuery("");
      return;
    }

    const query = inputValue.slice(atIndex + 1).trim();
    setSearchQuery(query);

    if (query.length === 0) {
      setShowDropdown(true);
      setDebouncedQuery("");
      return;
    }

    // Debounce the search query to avoid excessive API calls
    const timeoutId = setTimeout(() => {
      setDebouncedQuery(query);
      setShowDropdown(true);
      setSelectedIndex(0);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [inputValue]);

  const handleSelectUser = (user: User) => {
    // Add user to selected list
    onUsersChange([...selectedUsers, user]);

    // Clear input and close dropdown
    setInputValue("");
    setShowDropdown(false);
    setSearchQuery("");
    setDebouncedQuery("");

    // Focus back on input
    inputRef.current?.focus();
  };

  const handleRemoveUser = (userId: string) => {
    onUsersChange(selectedUsers.filter((user) => user.id !== userId));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || searchResults.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
      case "Tab":
        e.preventDefault();
        if (searchResults[selectedIndex]) {
          handleSelectUser(searchResults[selectedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setShowDropdown(false);
        break;
    }
  };

  return (
    <div className={className}>
      <div className="relative">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full"
        />
        {showDropdown && inputValue.includes("@") && (
          <div className="absolute top-full left-0 w-full mt-1 z-[200] rounded-md border bg-popover text-popover-foreground shadow-md">
            <div className="max-h-60 overflow-y-auto">
              {isSearching ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">Searching...</span>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="py-1">
                  {searchResults.map((user, index) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleSelectUser(user)}
                      className={`w-full text-left px-3 py-2 hover:bg-muted transition-colors ${
                        index === selectedIndex ? "bg-muted" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{user.name}</span>
                        {user.type === 'writer' && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Writer</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {user.email || (user.type === 'writer' ? 'External writer' : 'No email')}
                        {user.role && user.type !== 'writer' && ` • ${user.role}`}
                      </div>
                    </button>
                  ))}
                </div>
              ) : searchQuery.length > 0 ? (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  No users or writers found
                </div>
              ) : (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  Type to search users or writers...
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Selected users badges */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedUsers.map((user) => (
            <UserBadge
              key={user.id}
              name={user.name}
              email={user.email}
              onRemove={() => handleRemoveUser(user.id)}
              disabled={disabled}
              isWriter={user.type === 'writer'}
            />
          ))}
        </div>
      )}
    </div>
  );
}
