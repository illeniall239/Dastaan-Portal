"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { BackButton } from "@/components/ui/back-button";

const zodiacSigns = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
];

interface Character {
  id: number;
  // Basic Info
  name: string;
  gender: string;
  siblingSeniority: string;
  // Thoughts Process
  social: string;
  religious: string;
  emotionalDefinitions: string;
  culturalInspirations: string;
  biggestYes: string;
  biggestNo: string;
  // Personality
  zodiacSign: string;
  personality: string; // introvert or extrovert
  speechConstruction: string;
  // Education
  educationType: string; // co-ed or non co-ed
  schooling: string;
  // Physical & Character
  physicalHabit: string;
  outlook: string;
  catchPhrase: string;
  weaknesses: string;
  strengths: string;
  // Collectables
  need: string;
  want: string;
  desire: string;
  // Reflex
  happiness: string;
  sadness: string;
  difficulty: string;
  // TRP From
  sameGender: string;
  oppositeGender: string;
  elders: string;
  // References
  referenceScene: string;
  characterInspiration: string;
}

const initialCharacter: Character = {
  id: 1,
  name: "",
  gender: "",
  siblingSeniority: "",
  social: "",
  religious: "",
  emotionalDefinitions: "",
  culturalInspirations: "",
  biggestYes: "",
  biggestNo: "",
  zodiacSign: "",
  personality: "",
  speechConstruction: "",
  educationType: "",
  schooling: "",
  physicalHabit: "",
  outlook: "",
  catchPhrase: "",
  weaknesses: "",
  strengths: "",
  need: "",
  want: "",
  desire: "",
  happiness: "",
  sadness: "",
  difficulty: "",
  sameGender: "",
  oppositeGender: "",
  elders: "",
  referenceScene: "",
  characterInspiration: "",
};

export function CharacterForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [characters, setCharacters] = useState<Character[]>([initialCharacter]);
  const [expandedCharacters, setExpandedCharacters] = useState<number[]>([1]);

  const addCharacter = () => {
    const newId = characters.length > 0 ? Math.max(...characters.map((c) => c.id)) + 1 : 1;
    const newCharacter = { ...initialCharacter, id: newId };
    setCharacters([...characters, newCharacter]);
    setExpandedCharacters([...expandedCharacters, newId]);
  };

  const removeCharacter = (id: number) => {
    if (characters.length > 1) {
      setCharacters(characters.filter((char) => char.id !== id));
      setExpandedCharacters(expandedCharacters.filter((charId) => charId !== id));
    }
  };

  const updateCharacter = (id: number, field: keyof Character, value: string) => {
    setCharacters(
      characters.map((char) => (char.id === id ? { ...char, [field]: value } : char))
    );
  };

  const toggleCharacterExpanded = (id: number) => {
    setExpandedCharacters((prev) =>
      prev.includes(id) ? prev.filter((charId) => charId !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Validate required fields for each character
    for (let i = 0; i < characters.length; i++) {
      const char = characters[i];
      if (!char.name || !char.gender) {
        toast.error(
          `Character ${i + 1}: Name and Gender are required fields`
        );
        setIsLoading(false);
        return;
      }
    }

    try {
      // TODO: Implement API call to submit characters
      console.log("Characters data:", characters);

      toast.success("Characters submitted successfully!");
      // Reset form or redirect
    } catch (error: any) {
      console.error("Error submitting characters:", error);
      toast.error(`Failed to submit: ${error.message || "Please try again."}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="py-6 space-y-6 max-w-6xl mx-auto px-4 sm:px-6">
        {/* Back Button */}
        <BackButton fallbackHref="/evaluator" variant="outline" size="sm" />

        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Character Development</h1>
          <div className="flex gap-3">
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
        </div>

        {/* Characters List */}
        {characters.map((character, index) => {
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
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                      Basic Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`name-${character.id}`}>
                          Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id={`name-${character.id}`}
                          placeholder="Character name"
                          value={character.name}
                          onChange={(e) =>
                            updateCharacter(character.id, "name", e.target.value)
                          }
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`gender-${character.id}`}>
                          Gender <span className="text-red-500">*</span>
                        </Label>
                        <select
                          id={`gender-${character.id}`}
                          value={character.gender}
                          onChange={(e) =>
                            updateCharacter(character.id, "gender", e.target.value)
                          }
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          required
                        >
                          <option value="">Select gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`siblingSeniority-${character.id}`}>
                          Sibling Seniority
                        </Label>
                        <Input
                          id={`siblingSeniority-${character.id}`}
                          placeholder="e.g., Eldest, Middle, Youngest"
                          value={character.siblingSeniority}
                          onChange={(e) =>
                            updateCharacter(
                              character.id,
                              "siblingSeniority",
                              e.target.value
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Thoughts Process */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                      Thoughts Process
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`social-${character.id}`}>Social</Label>
                        <Textarea
                          id={`social-${character.id}`}
                          placeholder="Social background and interactions..."
                          rows={3}
                          value={character.social}
                          onChange={(e) =>
                            updateCharacter(character.id, "social", e.target.value)
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`religious-${character.id}`}>Religious</Label>
                        <Textarea
                          id={`religious-${character.id}`}
                          placeholder="Religious beliefs and practices..."
                          rows={3}
                          value={character.religious}
                          onChange={(e) =>
                            updateCharacter(character.id, "religious", e.target.value)
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`emotionalDefinitions-${character.id}`}>
                          Emotional Definitions
                        </Label>
                        <Textarea
                          id={`emotionalDefinitions-${character.id}`}
                          placeholder="Emotional characteristics and patterns..."
                          rows={3}
                          value={character.emotionalDefinitions}
                          onChange={(e) =>
                            updateCharacter(
                              character.id,
                              "emotionalDefinitions",
                              e.target.value
                            )
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`culturalInspirations-${character.id}`}>
                          Cultural Inspirations
                        </Label>
                        <Textarea
                          id={`culturalInspirations-${character.id}`}
                          placeholder="Cultural influences and inspirations..."
                          rows={3}
                          value={character.culturalInspirations}
                          onChange={(e) =>
                            updateCharacter(
                              character.id,
                              "culturalInspirations",
                              e.target.value
                            )
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`biggestYes-${character.id}`}>Biggest Yes</Label>
                        <Textarea
                          id={`biggestYes-${character.id}`}
                          placeholder="What the character strongly agrees with..."
                          rows={3}
                          value={character.biggestYes}
                          onChange={(e) =>
                            updateCharacter(character.id, "biggestYes", e.target.value)
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`biggestNo-${character.id}`}>Biggest No</Label>
                        <Textarea
                          id={`biggestNo-${character.id}`}
                          placeholder="What the character strongly disagrees with..."
                          rows={3}
                          value={character.biggestNo}
                          onChange={(e) =>
                            updateCharacter(character.id, "biggestNo", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Personality Traits */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                      Personality Traits
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`zodiacSign-${character.id}`}>Zodiac Sign</Label>
                        <select
                          id={`zodiacSign-${character.id}`}
                          value={character.zodiacSign}
                          onChange={(e) =>
                            updateCharacter(character.id, "zodiacSign", e.target.value)
                          }
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <option value="">Select zodiac sign</option>
                          {zodiacSigns.map((sign) => (
                            <option key={sign} value={sign.toLowerCase()}>
                              {sign}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label>Personality Type</Label>
                        <div className="flex gap-6 items-center h-10">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`personality-${character.id}`}
                              value="introvert"
                              checked={character.personality === "introvert"}
                              onChange={(e) =>
                                updateCharacter(
                                  character.id,
                                  "personality",
                                  e.target.value
                                )
                              }
                              className="w-4 h-4 text-[#224794] focus:ring-[#224794]"
                            />
                            <span>Introvert</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`personality-${character.id}`}
                              value="extrovert"
                              checked={character.personality === "extrovert"}
                              onChange={(e) =>
                                updateCharacter(
                                  character.id,
                                  "personality",
                                  e.target.value
                                )
                              }
                              className="w-4 h-4 text-[#224794] focus:ring-[#224794]"
                            />
                            <span>Extrovert</span>
                          </label>
                        </div>
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor={`speechConstruction-${character.id}`}>
                          Speech Construction
                        </Label>
                        <Textarea
                          id={`speechConstruction-${character.id}`}
                          placeholder="How the character speaks, tone, mannerisms..."
                          rows={3}
                          value={character.speechConstruction}
                          onChange={(e) =>
                            updateCharacter(
                              character.id,
                              "speechConstruction",
                              e.target.value
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Education */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                      Education
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`educationType-${character.id}`}>
                          Education Type
                        </Label>
                        <select
                          id={`educationType-${character.id}`}
                          value={character.educationType}
                          onChange={(e) =>
                            updateCharacter(
                              character.id,
                              "educationType",
                              e.target.value
                            )
                          }
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <option value="">Select type</option>
                          <option value="co-ed">Co-ed</option>
                          <option value="non-co-ed">Non Co-ed</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`schooling-${character.id}`}>Schooling</Label>
                        <Textarea
                          id={`schooling-${character.id}`}
                          placeholder="Educational background and institutions..."
                          rows={3}
                          value={character.schooling}
                          onChange={(e) =>
                            updateCharacter(character.id, "schooling", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Physical & Character Traits */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                      Physical & Character Traits
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`physicalHabit-${character.id}`}>
                          Physical Habit
                        </Label>
                        <Textarea
                          id={`physicalHabit-${character.id}`}
                          placeholder="Physical habits and mannerisms..."
                          rows={3}
                          value={character.physicalHabit}
                          onChange={(e) =>
                            updateCharacter(
                              character.id,
                              "physicalHabit",
                              e.target.value
                            )
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`outlook-${character.id}`}>Outlook</Label>
                        <Textarea
                          id={`outlook-${character.id}`}
                          placeholder="Physical appearance and style..."
                          rows={3}
                          value={character.outlook}
                          onChange={(e) =>
                            updateCharacter(character.id, "outlook", e.target.value)
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`catchPhrase-${character.id}`}>
                          Catch Phrase
                        </Label>
                        <Input
                          id={`catchPhrase-${character.id}`}
                          placeholder="Character's signature phrase..."
                          value={character.catchPhrase}
                          onChange={(e) =>
                            updateCharacter(
                              character.id,
                              "catchPhrase",
                              e.target.value
                            )
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`weaknesses-${character.id}`}>Weaknesses</Label>
                        <Textarea
                          id={`weaknesses-${character.id}`}
                          placeholder="Character weaknesses and flaws..."
                          rows={3}
                          value={character.weaknesses}
                          onChange={(e) =>
                            updateCharacter(character.id, "weaknesses", e.target.value)
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`strengths-${character.id}`}>Strengths</Label>
                        <Textarea
                          id={`strengths-${character.id}`}
                          placeholder="Character strengths and abilities..."
                          rows={3}
                          value={character.strengths}
                          onChange={(e) =>
                            updateCharacter(character.id, "strengths", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Collectables */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                      Collectables
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`need-${character.id}`}>Need</Label>
                        <Textarea
                          id={`need-${character.id}`}
                          placeholder="What the character needs..."
                          rows={3}
                          value={character.need}
                          onChange={(e) =>
                            updateCharacter(character.id, "need", e.target.value)
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`want-${character.id}`}>Want</Label>
                        <Textarea
                          id={`want-${character.id}`}
                          placeholder="What the character wants..."
                          rows={3}
                          value={character.want}
                          onChange={(e) =>
                            updateCharacter(character.id, "want", e.target.value)
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`desire-${character.id}`}>Desire</Label>
                        <Textarea
                          id={`desire-${character.id}`}
                          placeholder="What the character desires..."
                          rows={3}
                          value={character.desire}
                          onChange={(e) =>
                            updateCharacter(character.id, "desire", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Reflex */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                      Reflex
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`happiness-${character.id}`}>Happiness</Label>
                        <Textarea
                          id={`happiness-${character.id}`}
                          placeholder="How the character reacts to happiness..."
                          rows={3}
                          value={character.happiness}
                          onChange={(e) =>
                            updateCharacter(character.id, "happiness", e.target.value)
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`sadness-${character.id}`}>Sadness</Label>
                        <Textarea
                          id={`sadness-${character.id}`}
                          placeholder="How the character reacts to sadness..."
                          rows={3}
                          value={character.sadness}
                          onChange={(e) =>
                            updateCharacter(character.id, "sadness", e.target.value)
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`difficulty-${character.id}`}>Difficulty</Label>
                        <Textarea
                          id={`difficulty-${character.id}`}
                          placeholder="How the character handles difficulty..."
                          rows={3}
                          value={character.difficulty}
                          onChange={(e) =>
                            updateCharacter(character.id, "difficulty", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* TRP From */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                      TRP From
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`sameGender-${character.id}`}>Same Gender</Label>
                        <Textarea
                          id={`sameGender-${character.id}`}
                          placeholder="How same gender perceives this character..."
                          rows={3}
                          value={character.sameGender}
                          onChange={(e) =>
                            updateCharacter(character.id, "sameGender", e.target.value)
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`oppositeGender-${character.id}`}>
                          Opposite Gender
                        </Label>
                        <Textarea
                          id={`oppositeGender-${character.id}`}
                          placeholder="How opposite gender perceives this character..."
                          rows={3}
                          value={character.oppositeGender}
                          onChange={(e) =>
                            updateCharacter(
                              character.id,
                              "oppositeGender",
                              e.target.value
                            )
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`elders-${character.id}`}>Elders</Label>
                        <Textarea
                          id={`elders-${character.id}`}
                          placeholder="How elders perceive this character..."
                          rows={3}
                          value={character.elders}
                          onChange={(e) =>
                            updateCharacter(character.id, "elders", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* References */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                      References
                    </h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor={`referenceScene-${character.id}`}>
                          Reference Scene for All Above
                        </Label>
                        <Textarea
                          id={`referenceScene-${character.id}`}
                          placeholder="Reference scenes that demonstrate the character's traits..."
                          rows={6}
                          value={character.referenceScene}
                          onChange={(e) =>
                            updateCharacter(
                              character.id,
                              "referenceScene",
                              e.target.value
                            )
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`characterInspiration-${character.id}`}>
                          Character Inspiration
                        </Label>
                        <Textarea
                          id={`characterInspiration-${character.id}`}
                          placeholder="Real or fictional characters that inspired this character..."
                          rows={4}
                          value={character.characterInspiration}
                          onChange={(e) =>
                            updateCharacter(
                              character.id,
                              "characterInspiration",
                              e.target.value
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <Button asChild variant="outline" type="button">
            <Link href="/evaluator">Cancel</Link>
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-[#224794] hover:bg-[#1a3670]"
          >
            {isLoading ? "Submitting..." : "Submit Characters"}
          </Button>
        </div>
      </div>
    </form>
  );
}
