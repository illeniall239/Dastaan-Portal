"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { UserBadge } from "@/components/ui/user-badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2 } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  department?: string;
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
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Search users when @ is typed
  useEffect(() => {
    const atIndex = inputValue.lastIndexOf("@");

    if (atIndex === -1) {
      setShowDropdown(false);
      setSearchQuery("");
      return;
    }

    const query = inputValue.slice(atIndex + 1).trim();
    setSearchQuery(query);

    if (query.length === 0) {
      setShowDropdown(true);
      setIsSearching(false);
      setSearchResults([]);
      return;
    }

    // Debounce search
    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      setShowDropdown(true);

      try {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);

        if (!response.ok) {
          console.error("User search failed:", response.status, response.statusText);
          setSearchResults([]);
          setIsSearching(false);
          return;
        }

        const text = await response.text();
        if (!text) {
          console.error("Empty response from user search");
          setSearchResults([]);
          setIsSearching(false);
          return;
        }

        const data = JSON.parse(text);

        if (data.users) {
          // Filter out already selected users
          const filteredUsers = data.users.filter(
            (user: User) => !selectedUsers.some((selected) => selected.id === user.id)
          );
          setSearchResults(filteredUsers);
          setSelectedIndex(0);
        }
      } catch (error) {
        console.error("Error searching users:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [inputValue, selectedUsers]);

  const handleSelectUser = (user: User) => {
    // Add user to selected list
    onUsersChange([...selectedUsers, user]);

    // Clear input and close dropdown
    setInputValue("");
    setShowDropdown(false);
    setSearchResults([]);
    setSearchQuery("");

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
      <Popover open={showDropdown} onOpenChange={setShowDropdown}>
        <PopoverTrigger asChild>
          <div>
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              className="w-full"
            />
          </div>
        </PopoverTrigger>
        {showDropdown && inputValue.includes("@") && (
          <PopoverContent
            className="w-[var(--radix-popover-trigger-width)] p-0"
            align="start"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
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
                      <div className="font-medium text-sm">{user.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {user.email}
                        {user.role && ` • ${user.role}`}
                      </div>
                    </button>
                  ))}
                </div>
              ) : searchQuery.length > 0 ? (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  No users found
                </div>
              ) : (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  Type to search users...
                </div>
              )}
            </div>
          </PopoverContent>
        )}
      </Popover>

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
            />
          ))}
        </div>
      )}
    </div>
  );
}
