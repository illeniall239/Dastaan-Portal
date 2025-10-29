"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import type { StoryForNegotiation } from "@/lib/negotiations/client";
import type { DeliveryEpisode } from "@/lib/validations/negotiations";
import {
  RATE_RANGES,
  TIME_SLOTS,
  getEpisodeCountWarning,
} from "@/lib/validations/negotiations";

interface NegotiationFormProps {
  stories: StoryForNegotiation[];
  redirectPath: string;
}

export function NegotiationForm({ stories, redirectPath }: NegotiationFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [selectedStoryId, setSelectedStoryId] = useState("");
  const [writerName, setWriterName] = useState("");
  const [genre, setGenre] = useState("");
  const [rateRange, setRateRange] = useState("");
  const [proposedPrice, setProposedPrice] = useState("");
  const [estimatedEpisodes, setEstimatedEpisodes] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [projectStartDate, setProjectStartDate] = useState("");
  const [completionDate, setCompletionDate] = useState("");
  const [paymentStructure, setPaymentStructure] = useState("");
  const [priceJustification, setPriceJustification] = useState("");
  const [contractType, setContractType] = useState<"net" | "gross">("net");

  // Delivery schedule state (individual episodes)
  const [deliverySchedule, setDeliverySchedule] = useState<DeliveryEpisode[]>([
    { episode_number: 1, episode_title: "", delivery_date: "" },
  ]);

  // Auto-populate writer name and genre when story is selected
  useEffect(() => {
    if (selectedStoryId) {
      const story = stories.find((s) => s.id === selectedStoryId);
      if (story) {
        setWriterName(story.writer_originator_name);
        setGenre(story.genre);
      }
    } else {
      setWriterName("");
      setGenre("");
    }
  }, [selectedStoryId, stories]);

  const handleAddEpisode = () => {
    // Auto-increment episode number
    const nextEpisodeNumber = deliverySchedule.length + 1;
    setDeliverySchedule([
      ...deliverySchedule,
      { episode_number: nextEpisodeNumber, episode_title: "", delivery_date: "" },
    ]);
  };

  const handleRemoveEpisode = (index: number) => {
    if (deliverySchedule.length === 1) {
      toast.error("At least one episode is required");
      return;
    }
    const newSchedule = deliverySchedule.filter((_, i) => i !== index);
    setDeliverySchedule(newSchedule);
  };

  const handleEpisodeChange = (
    index: number,
    field: "episode_number" | "episode_title" | "delivery_date",
    value: string | number
  ) => {
    const newSchedule = [...deliverySchedule];
    if (field === "episode_number") {
      newSchedule[index][field] = typeof value === "string" ? parseInt(value) || 1 : value;
    } else {
      newSchedule[index][field] = value as string;
    }
    setDeliverySchedule(newSchedule);
  };

  const validateForm = () => {
    if (!selectedStoryId) {
      toast.error("Please select a project");
      return false;
    }
    if (!rateRange) {
      toast.error("Please select a rate range");
      return false;
    }
    if (!estimatedEpisodes || parseInt(estimatedEpisodes) < 1) {
      toast.error("Please enter a valid estimated episode count");
      return false;
    }
    if (!timeSlot) {
      toast.error("Please select a time slot");
      return false;
    }
    if (!projectStartDate) {
      toast.error("Please select a project start date");
      return false;
    }

    // Validate delivery schedule (individual episodes)
    for (let i = 0; i < deliverySchedule.length; i++) {
      const episode = deliverySchedule[i];
      if (!episode.episode_number || episode.episode_number < 1) {
        toast.error(`Please enter a valid episode number for episode ${i + 1}`);
        return false;
      }
      if (!episode.delivery_date) {
        toast.error(`Please enter delivery date for episode ${episode.episode_number}`);
        return false;
      }
    }

    // Check for duplicate episode numbers
    const episodeNumbers = deliverySchedule.map((e) => e.episode_number);
    const uniqueNumbers = new Set(episodeNumbers);
    if (uniqueNumbers.size !== episodeNumbers.length) {
      toast.error("Duplicate episode numbers are not allowed");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/negotiations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          story_id: selectedStoryId,
          writer_producer_name: writerName,
          genre,
          rate_range: rateRange,
          proposed_price: proposedPrice ? parseFloat(proposedPrice) : null,
          estimated_episodes: parseInt(estimatedEpisodes),
          suggested_time_slot: timeSlot,
          project_start_date: projectStartDate,
          expected_completion_date: completionDate || null,
          delivery_schedule: deliverySchedule,
          payment_structure: paymentStructure || null,
          price_justification: priceJustification || null,
          contract_type: contractType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create negotiation");
      }

      toast.success("Negotiation created successfully!");
      router.push(redirectPath);
      router.refresh();
    } catch (error) {
      console.error("Error creating negotiation:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create negotiation");
    } finally {
      setIsLoading(false);
    }
  };

  // Get today's date for min attribute
  const today = new Date().toISOString().split("T")[0];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Project Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project">Project Name *</Label>
            <Select value={selectedStoryId} onValueChange={setSelectedStoryId}>
              <SelectTrigger id="project">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {stories.length === 0 ? (
                  <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                    No approved stories available
                  </div>
                ) : (
                  stories.map((story) => (
                    <SelectItem key={story.id} value={story.id}>
                      {story.title} ({story.story_id})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Select from approved story ideas
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="writerName">Writer Name *</Label>
              <Input
                id="writerName"
                value={writerName}
                readOnly
                disabled
                placeholder="Auto-populated from project"
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="genre">Genre *</Label>
              <Input
                id="genre"
                value={genre}
                readOnly
                disabled
                placeholder="Auto-populated from project"
                className="bg-muted"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Financial Terms</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contractType">Contract Type *</Label>
            <Select value={contractType} onValueChange={(value) => setContractType(value as "net" | "gross")}>
              <SelectTrigger id="contractType">
                <SelectValue placeholder="Select contract type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="net">Contract as per Net</SelectItem>
                <SelectItem value="gross">Contract as per Gross</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Net: expenses deducted from total | Gross: full contract amount
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rateRange">Rate Range (PKR) *</Label>
            <Select value={rateRange} onValueChange={setRateRange}>
              <SelectTrigger id="rateRange">
                <SelectValue placeholder="Select rate range" />
              </SelectTrigger>
              <SelectContent>
                {RATE_RANGES.map((range) => (
                  <SelectItem key={range} value={range}>
                    ₨{range}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="proposedPrice">Proposed Price (PKR)</Label>
            <Input
              id="proposedPrice"
              type="number"
              value={proposedPrice}
              onChange={(e) => setProposedPrice(e.target.value)}
              placeholder="Enter specific amount (optional)"
              min="0"
              step="1000"
            />
            <p className="text-sm text-muted-foreground">
              Optionally specify an exact amount within the selected range
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentStructure">Payment Structure</Label>
            <Textarea
              id="paymentStructure"
              value={paymentStructure}
              onChange={(e) => setPaymentStructure(e.target.value)}
              placeholder="Describe payment milestones, advance, installments, etc."
              rows={3}
              maxLength={1000}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="priceJustification">Price Justification</Label>
            <Textarea
              id="priceJustification"
              value={priceJustification}
              onChange={(e) => setPriceJustification(e.target.value)}
              placeholder="Explain the reasoning behind the proposed price"
              rows={3}
              maxLength={2000}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Production Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="estimatedEpisodes">Estimated Episodes *</Label>
              <Input
                id="estimatedEpisodes"
                type="number"
                value={estimatedEpisodes}
                onChange={(e) => setEstimatedEpisodes(e.target.value)}
                placeholder="Enter total episode count"
                min="1"
                max="500"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeSlot">Suggested Time Slot *</Label>
              <Select value={timeSlot} onValueChange={setTimeSlot}>
                <SelectTrigger id="timeSlot">
                  <SelectValue placeholder="Select time slot" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map((slot) => (
                    <SelectItem key={slot} value={slot}>
                      {slot}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="projectStartDate">Project Start Date *</Label>
              <Input
                id="projectStartDate"
                type="date"
                value={projectStartDate}
                onChange={(e) => setProjectStartDate(e.target.value)}
                min={today}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="completionDate">Expected Completion Date</Label>
              <Input
                id="completionDate"
                type="date"
                value={completionDate}
                onChange={(e) => setCompletionDate(e.target.value)}
                min={projectStartDate || today}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle>Episode Delivery Schedule *</CardTitle>
            {estimatedEpisodes && deliverySchedule.length > 0 && (
              <div className="text-sm">
                {getEpisodeCountWarning(deliverySchedule, parseInt(estimatedEpisodes)) && (
                  <span className="text-amber-600 font-medium">
                    {getEpisodeCountWarning(deliverySchedule, parseInt(estimatedEpisodes))}
                  </span>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Add individual episodes with their delivery dates. Episode numbers can be edited.
          </p>

          {deliverySchedule.map((episode, index) => (
            <div key={index} className="flex gap-4 items-start border p-4 rounded-lg">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`episode-number-${index}`}>Episode # *</Label>
                  <Input
                    id={`episode-number-${index}`}
                    type="number"
                    value={episode.episode_number}
                    onChange={(e) =>
                      handleEpisodeChange(index, "episode_number", e.target.value)
                    }
                    min="1"
                    placeholder="1"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`episode-title-${index}`}>Episode Title</Label>
                  <Input
                    id={`episode-title-${index}`}
                    value={episode.episode_title || ""}
                    onChange={(e) =>
                      handleEpisodeChange(index, "episode_title", e.target.value)
                    }
                    placeholder="Optional episode title"
                    maxLength={200}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`delivery-date-${index}`}>Delivery Date *</Label>
                  <Input
                    id={`delivery-date-${index}`}
                    type="date"
                    value={episode.delivery_date}
                    onChange={(e) =>
                      handleEpisodeChange(index, "delivery_date", e.target.value)
                    }
                    min={projectStartDate || today}
                    required
                  />
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveEpisode(index)}
                disabled={deliverySchedule.length === 1}
                className="mt-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={handleAddEpisode}
            className="w-full hover:bg-[#224794] hover:text-white hover:border-[#224794] hover:scale-100 transition-colors duration-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Episode
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Creating..." : "Create Negotiation"}
        </Button>
      </div>
    </form>
  );
}
