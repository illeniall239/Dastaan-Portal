"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

// Define the character interface
interface Character {
  id: string;
  name: string;
  description: string;
  role: string;
  arc: string;
  relationships: string[];
  traits: string[];
  // Add other fields as needed
}

interface CharacterEditorProps {
  charactersData?: Record<string, Character> | null; // This could be undefined or null
  onSave?: (characters: Character[]) => void;
}

const zodiacSigns = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
];

export default function CharacterEditor({ charactersData, onSave }: CharacterEditorProps) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [expandedCharacters, setExpandedCharacters] = useState<string[]>([]);

  // Convert characters object to array with proper null check
  useEffect(() => {
    // PROBLEMATIC LINE WAS HERE: Object.values(charactersData) when charactersData was null/undefined
    // FIXED: Add proper null check before accessing charactersData
    if (charactersData && typeof charactersData === 'object') {
      const charsArray = Object.values(charactersData);
      
      // Ensure all characters have required properties
      const initChars = charsArray.map((char) => ({
        id: char.id || Date.now().toString(),
        name: char.name || "",
        description: char.description || "",
        role: char.role || "",
        arc: char.arc || "",
        relationships: Array.isArray(char.relationships) ? char.relationships : [],
        traits: Array.isArray(char.traits) ? char.traits : [],
      }));
      
      setCharacters(initChars);
      
      // Expand the first few characters by default
      if (initChars.length > 0) {
        setExpandedCharacters(initChars.slice(0, 3).map(c => c.id));
      }
    } else {
      // Initialize with empty array if charactersData is null or undefined
      setCharacters([]);
    }
  }, [charactersData]);

  const addCharacter = () => {
    const newCharacter: Character = {
      id: `char-${Date.now()}`,
      name: "",
      description: "",
      role: "",
      arc: "",
      relationships: [],
      traits: [],
    };
    setCharacters([...characters, newCharacter]);
    setExpandedCharacters([...expandedCharacters, newCharacter.id]);
  };

  const removeCharacter = (id: string) => {
    if (characters.length > 1) {
      setCharacters(characters.filter((char) => char.id !== id));
      setExpandedCharacters(expandedCharacters.filter((charId) => charId !== id));
    }
  };

  const updateCharacter = (id: string, field: keyof Character, value: any) => {
    setCharacters(
      characters.map((char) => (char.id === id ? { ...char, [field]: value } : char))
    );
  };

  const toggleCharacterExpanded = (id: string) => {
    setExpandedCharacters((prev) =>
      prev.includes(id) 
        ? prev.filter((charId) => charId !== id) 
        : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    for (let i = 0; i < characters.length; i++) {
      const char = characters[i];
      if (!char.name) {
        toast.error(`Character ${i + 1}: Name is required`);
        return;
      }
    }

    try {
      // Call the onSave prop if provided
      if (onSave) {
        onSave(characters);
      }
      toast.success("Characters saved successfully!");
    } catch (error: any) {
      console.error("Error saving characters:", error);
      toast.error(`Failed to save: ${error.message || "Please try again."}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="py-6 space-y-6 max-w-6xl mx-auto px-4 sm:px-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Character Editor</h1>
        <Button
          type="button"
          size="sm"
          onClick={addCharacter}
          className="bg-[#224794] hover:bg-[#1a3670]"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Character
        </Button>
      </div>

      {characters.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No characters to edit. Add a character to get started.</p>
        </div>
      ) : (
        characters.map((character, index) => {
          const isExpanded = expandedCharacters.includes(character.id);

          return (
            <Card key={character.id} className="border-2 border-indigo-300">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <CardTitle>
                      Character {index + 1}
                      {character.name && `: ${character.name}`}
                    </CardTitle>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleCharacterExpanded(character.id)}
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                  {characters.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCharacter(character.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  )}
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`name-${character.id}`}>
                        Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id={`name-${character.id}`}
                        placeholder="Character name"
                        value={character.name}
                        onChange={(e) => updateCharacter(character.id, "name", e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`role-${character.id}`}>Role</Label>
                      <Input
                        id={`role-${character.id}`}
                        placeholder="Character role (e.g., protagonist, antagonist)"
                        value={character.role}
                        onChange={(e) => updateCharacter(character.id, "role", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`description-${character.id}`}>Description</Label>
                    <Textarea
                      id={`description-${character.id}`}
                      placeholder="Character description..."
                      rows={4}
                      value={character.description}
                      onChange={(e) => updateCharacter(character.id, "description", e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`arc-${character.id}`}>Character Arc</Label>
                      <Textarea
                        id={`arc-${character.id}`}
                        placeholder="Character's development arc..."
                        rows={3}
                        value={character.arc}
                        onChange={(e) => updateCharacter(character.id, "arc", e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`traits-${character.id}`}>Traits</Label>
                      <Textarea
                        id={`traits-${character.id}`}
                        placeholder="Comma-separated traits (e.g., brave, curious, stubborn)"
                        rows={3}
                        value={character.traits.join(", ")}
                        onChange={(e) => updateCharacter(character.id, "traits", e.target.value.split(",").map(t => t.trim()))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`relationships-${character.id}`}>Relationships</Label>
                    <Textarea
                      id={`relationships-${character.id}`}
                      placeholder="Relationships with other characters..."
                      rows={3}
                      value={character.relationships.join(", ")}
                      onChange={(e) => updateCharacter(character.id, "relationships", e.target.value.split(",").map(r => r.trim()))}
                    />
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })
      )}

      {characters.length > 0 && (
        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="submit"
            className="bg-[#224794] hover:bg-[#1a3670]"
          >
            Save Characters
          </Button>
        </div>
      )}
    </form>
  );
}