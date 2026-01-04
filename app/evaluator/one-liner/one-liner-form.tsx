"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { WriterSelect } from "@/components/writers/writer-select";
import type { Writer } from "@/types";
import { BackButton } from "@/components/ui/back-button";

interface Track {
  id: number;
  content: string;
}

interface Act {
  id: number;
  content: string;
}

export function OneLinerForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedWriter, setSelectedWriter] = useState<Writer | undefined>();
  const [tracks, setTracks] = useState<Track[]>([{ id: 1, content: "" }]);
  const [acts, setActs] = useState<Act[]>([{ id: 1, content: "" }]);

  // Form state
  const [formData, setFormData] = useState({
    timeSlot: "",
    writerId: "",
    genre: "",
    noOfEpisodes: "",
    suggestedDirector: "",
    suggestedProductionHouse: "",
    idea: "",
    subject: "",
    conflict: "",
    promiseOfPremise: "",
    character: "",
    // Protagonist
    protagonistSocial: "",
    protagonistEmotional: "",
    protagonistProgression: "",
    // Antagonist
    antagonistSocial: "",
    antagonistEmotional: "",
    antagonistProgression: "",
    // Supporting Characters
    supportingSocial: "",
    supportingEmotional: "",
    supportingProgression: "",
    // Plot and TRP
    plotSummary: "",
    trp: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Track handlers
  const addTrack = () => {
    setTracks([...tracks, { id: tracks.length + 1, content: "" }]);
  };

  const removeTrack = (id: number) => {
    if (tracks.length > 1) {
      setTracks(tracks.filter((track) => track.id !== id));
    }
  };

  const updateTrack = (id: number, content: string) => {
    setTracks(tracks.map((track) => (track.id === id ? { ...track, content } : track)));
  };

  // Act handlers
  const addAct = () => {
    setActs([...acts, { id: acts.length + 1, content: "" }]);
  };

  const removeAct = (id: number) => {
    if (acts.length > 1) {
      setActs(acts.filter((act) => act.id !== id));
    }
  };

  const updateAct = (id: number, value: string) => {
    setActs(acts.map((act) => (act.id === id ? { ...act, content: value } : act)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // TODO: Implement API call to submit one-liner
      console.log("Form data:", { ...formData, tracks, acts });

      toast.success("One-liner submitted successfully!");
      // Reset form or redirect
    } catch (error: any) {
      console.error("Error submitting one-liner:", error);
      toast.error(`Failed to submit: ${error.message || "Please try again."}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="py-6 space-y-6 max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:gap-6 mb-8">
          <BackButton fallbackHref="/evaluator" variant="outline" size="sm" className="w-fit" />
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">One-Liner Submission</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Submit a detailed one-liner for story evaluation
            </p>
          </div>
        </div>

        {/* Section 1: Basic Information */}
        <Card className="border-2 border-blue-200">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Time Slot */}
              <div className="space-y-2">
                <Label htmlFor="timeSlot">
                  Time Slot
                </Label>
                <select
                  id="timeSlot"
                  value={formData.timeSlot}
                  onChange={(e) => handleSelectChange("timeSlot", e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  required
                >
                  <option value="">Select time slot</option>
                  <option value="6:00 PM">6:00 PM</option>
                  <option value="7:00 PM">7:00 PM</option>
                  <option value="8:00 PM">8:00 PM</option>
                  <option value="9:00 PM">9:00 PM</option>
                  <option value="10:00 PM">10:00 PM</option>
                </select>
              </div>

              {/* Writer */}
              <div className="space-y-2">
                <Label htmlFor="writer">
                  Writer
                </Label>
                <WriterSelect
                  value={formData.writerId}
                  onChange={(writerId, writer) => {
                    setFormData(prev => ({ ...prev, writerId }));
                    setSelectedWriter(writer);
                  }}
                  disabled={isLoading}
                  required={false}
                  placeholder="Select a writer"
                />
              </div>

              {/* Genre */}
              <div className="space-y-2">
                <Label htmlFor="genre">
                  Genre
                </Label>
                <Input
                  id="genre"
                  placeholder="e.g., Drama, Comedy, Thriller"
                  value={formData.genre}
                  onChange={handleInputChange}
                  required
                />
              </div>

              {/* No of Episodes */}
              <div className="space-y-2">
                <Label htmlFor="noOfEpisodes">
                  No of Episodes
                </Label>
                <Input
                  id="noOfEpisodes"
                  type="number"
                  min="1"
                  placeholder="e.g., 25"
                  value={formData.noOfEpisodes}
                  onChange={handleInputChange}
                  required
                />
              </div>

              {/* Suggested Director */}
              <div className="space-y-2">
                <Label htmlFor="suggestedDirector">Suggested Director</Label>
                <Input
                  id="suggestedDirector"
                  placeholder="Director name"
                  value={formData.suggestedDirector}
                  onChange={handleInputChange}
                />
              </div>

              {/* Suggested Production House */}
              <div className="space-y-2">
                <Label htmlFor="suggestedProductionHouse">Suggested Production House</Label>
                <Input
                  id="suggestedProductionHouse"
                  placeholder="Production house name"
                  value={formData.suggestedProductionHouse}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Story Details */}
        <Card className="border-2 border-blue-200">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle>Story Details</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {/* Idea */}
            <div className="space-y-2">
              <Label htmlFor="idea">Idea</Label>
              <Textarea
                id="idea"
                placeholder="Describe the core idea of the story..."
                rows={6}
                value={formData.idea}
                onChange={handleInputChange}
              />
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject">Subject (Local or International Reference)</Label>
              <Input
                id="subject"
                placeholder="e.g., Local family drama, International thriller inspired by..."
                value={formData.subject}
                onChange={handleInputChange}
              />
            </div>

            {/* Conflict */}
            <div className="space-y-2">
              <Label htmlFor="conflict">Conflict</Label>
              <Textarea
                id="conflict"
                placeholder="Describe the main conflict..."
                rows={4}
                value={formData.conflict}
                onChange={handleInputChange}
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Tracks */}
        <Card className="border-2 border-blue-200">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex justify-between items-center">
              <CardTitle>Tracks</CardTitle>
              <Button type="button" size="sm" onClick={addTrack} className="bg-[#224794] hover:bg-[#1a3670]">
                <Plus className="h-4 w-4 mr-2" />
                Add Track
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {tracks.map((track, index) => (
              <div key={track.id} className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Track {index + 1}</Label>
                  {tracks.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTrack(track.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Textarea
                  placeholder={`Describe Track ${index + 1}...`}
                  rows={4}
                  value={track.content}
                  onChange={(e) => updateTrack(track.id, e.target.value)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Section 4: Premise & Character */}
        <Card className="border-2 border-blue-200">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle>Premise & Character</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {/* Promise of the Premise */}
            <div className="space-y-2">
              <Label htmlFor="promiseOfPremise">Promise of the Premise</Label>
              <Textarea
                id="promiseOfPremise"
                placeholder="What does this premise promise to the audience?"
                rows={5}
                value={formData.promiseOfPremise}
                onChange={handleInputChange}
              />
            </div>

            {/* Character */}
            <div className="space-y-2">
              <Label htmlFor="character">Character</Label>
              <Textarea
                id="character"
                placeholder="General character notes..."
                rows={5}
                value={formData.character}
                onChange={handleInputChange}
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 5: Character Details - Protagonist */}
        <Card className="border-2 border-green-200">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
            <CardTitle>Protagonist</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="protagonistSocial">Social Setting</Label>
              <Textarea
                id="protagonistSocial"
                placeholder="Describe the protagonist's social setting..."
                rows={3}
                value={formData.protagonistSocial}
                onChange={handleInputChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="protagonistEmotional">Emotional</Label>
              <Textarea
                id="protagonistEmotional"
                placeholder="Describe the protagonist's emotional state..."
                rows={3}
                value={formData.protagonistEmotional}
                onChange={handleInputChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="protagonistProgression">Progression</Label>
              <Textarea
                id="protagonistProgression"
                placeholder="Describe the protagonist's progression arc..."
                rows={3}
                value={formData.protagonistProgression}
                onChange={handleInputChange}
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 6: Character Details - Antagonist */}
        <Card className="border-2 border-red-200">
          <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50">
            <CardTitle>Antagonist</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="antagonistSocial">Social Setting</Label>
              <Textarea
                id="antagonistSocial"
                placeholder="Describe the antagonist's social setting..."
                rows={3}
                value={formData.antagonistSocial}
                onChange={handleInputChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="antagonistEmotional">Emotional</Label>
              <Textarea
                id="antagonistEmotional"
                placeholder="Describe the antagonist's emotional state..."
                rows={3}
                value={formData.antagonistEmotional}
                onChange={handleInputChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="antagonistProgression">Progression</Label>
              <Textarea
                id="antagonistProgression"
                placeholder="Describe the antagonist's progression arc..."
                rows={3}
                value={formData.antagonistProgression}
                onChange={handleInputChange}
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 7: Character Details - Supporting Characters */}
        <Card className="border-2 border-purple-200">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
            <CardTitle>Supporting Characters</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="supportingSocial">Social Setting</Label>
              <Textarea
                id="supportingSocial"
                placeholder="Describe the supporting characters' social setting..."
                rows={3}
                value={formData.supportingSocial}
                onChange={handleInputChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supportingEmotional">Emotional</Label>
              <Textarea
                id="supportingEmotional"
                placeholder="Describe the supporting characters' emotional state..."
                rows={3}
                value={formData.supportingEmotional}
                onChange={handleInputChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supportingProgression">Progression</Label>
              <Textarea
                id="supportingProgression"
                placeholder="Describe the supporting characters' progression arc..."
                rows={3}
                value={formData.supportingProgression}
                onChange={handleInputChange}
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 8: Acts */}
        <Card className="border-2 border-indigo-200">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50">
            <div className="flex justify-between items-center">
              <CardTitle>Acts</CardTitle>
              <Button type="button" size="sm" onClick={addAct} className="bg-[#224794] hover:bg-[#1a3670]">
                <Plus className="h-4 w-4 mr-2" />
                Add Act
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {acts.map((act, index) => (
              <div key={act.id} className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Act {index + 1}</Label>
                  {acts.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAct(act.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Textarea
                  placeholder={`Describe Act ${index + 1}...`}
                  rows={5}
                  value={act.content}
                  onChange={(e) => updateAct(act.id, e.target.value)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Section 9: Plot Summary */}
        <Card className="border-2 border-blue-200">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle>Plot Summary</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <Textarea
              id="plotSummary"
              placeholder="Provide an overall plot summary..."
              rows={8}
              value={formData.plotSummary}
              onChange={handleInputChange}
            />
          </CardContent>
        </Card>

        {/* Section 10: TRP */}
        <Card className="border-2 border-blue-200">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle>TRP (Trends/Selling Point)</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <Textarea
              id="trp"
              placeholder="Describe the trends and selling points..."
              rows={6}
              value={formData.trp}
              onChange={handleInputChange}
            />
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <Button asChild variant="outline" type="button">
            <Link href="/evaluator">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isLoading} className="bg-[#224794] hover:bg-[#1a3670]">
            {isLoading ? "Submitting..." : "Submit One-Liner"}
          </Button>
        </div>
      </div>
    </form>
  );
}
