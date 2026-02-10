"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { MentionInput } from "@/components/ui/mention-input";
import { toast } from "sonner";
import { createSimpleMeetingClient } from "@/lib/meetings/client";
import { WriterSelect } from "@/components/writers/writer-select";
import type { Writer } from "@/types";
import { useFormAutosave } from "@/lib/hooks/useFormAutosave";
import { DraftRestoreBanner } from "@/components/ui/draft-restore-banner";

interface User {
  id: string;
  name: string;
  email: string | null;
  role?: string;
  department?: string;
  type?: 'user' | 'writer';
}

interface QuickMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDateTime: Date | null;
  onMeetingCreated: () => void;
  userId: string;
}

export function QuickMeetingDialog({
  open,
  onOpenChange,
  selectedDateTime,
  onMeetingCreated,
  userId,
}: QuickMeetingDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedWriter, setSelectedWriter] = useState<Writer | undefined>();
  const [selectedAttendees, setSelectedAttendees] = useState<User[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>("09:00");
  const [formData, setFormData] = useState({
    sourceOfIdea: "",
    writerId: "",
    pocName: "",
    title: "",
    notes: "",
    location: "",
    duration: "60", // Duration in minutes
  });

  // Autosave
  const { hasDraft, draftLoaded, draftUpdatedAt, saveDraft, loadDraft, clearDraft } = useFormAutosave({
    formType: "quick_meeting",
    entityId: "_new",
    enabled: open,
  });

  const [draftDismissed, setDraftDismissed] = useState(false);

  // Reset form when dialog opens with new date
  useEffect(() => {
    if (open && selectedDateTime) {
      // Initialize time from selectedDateTime
      const hours = String(selectedDateTime.getHours()).padStart(2, '0');
      const minutes = String(selectedDateTime.getMinutes()).padStart(2, '0');
      setSelectedTime(`${hours}:${minutes}`);

      setFormData({
        sourceOfIdea: "",
        writerId: "",
        pocName: "",
        title: "",
        notes: "",
        location: "",
        duration: "60",
      });
      setSelectedAttendees([]);
      setDraftDismissed(false);
    }
  }, [open, selectedDateTime]);

  // Autosave on form state changes
  useEffect(() => {
    if (!open) return;
    saveDraft({
      ...formData,
      selectedTime,
    });
  }, [formData, selectedTime, saveDraft, open]);

  const handleRestoreDraft = useCallback(async () => {
    const data = await loadDraft();
    if (data) {
      const d = data as Record<string, any>;
      setFormData({
        sourceOfIdea: d.sourceOfIdea || "",
        writerId: d.writerId || "",
        pocName: d.pocName || "",
        title: d.title || "",
        notes: d.notes || "",
        location: d.location || "",
        duration: d.duration || "60",
      });
      if (d.selectedTime) setSelectedTime(d.selectedTime);
      setDraftDismissed(true);
      toast.success("Draft restored");
    }
  }, [loadDraft]);

  const handleDiscardDraft = useCallback(async () => {
    await clearDraft();
    setDraftDismissed(true);
  }, [clearDraft]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSourceChange = (value: string) => {
    setFormData((prev) => ({ ...prev, sourceOfIdea: value, writerId: "", pocName: "" }));
  };

  const handleWriterChange = (value: string) => {
    setFormData((prev) => ({ ...prev, writerId: value }));
  };

  const handleDurationChange = (value: string) => {
    setFormData((prev) => ({ ...prev, duration: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate form
      if (!formData.sourceOfIdea || !formData.title || !selectedDateTime) {
        toast.error("Please fill in all required fields");
        setIsLoading(false);
        return;
      }

      // Validate source-specific fields
      if (formData.sourceOfIdea === "writer" && !formData.writerId) {
        toast.error("Please select a writer");
        setIsLoading(false);
        return;
      }

      if ((formData.sourceOfIdea === "external_producer" || formData.sourceOfIdea === "in_house") && !formData.pocName.trim()) {
        toast.error("Please enter POC Name");
        setIsLoading(false);
        return;
      }

      // Determine contact name and email based on source
      let contactName = "";
      let contactEmail = "";
      let contactType = "";
      let category = "";

      if (formData.sourceOfIdea === "writer") {
        if (!selectedWriter) {
          toast.error("Please select a writer");
          setIsLoading(false);
          return;
        }
        contactName = selectedWriter.name;
        contactEmail = selectedWriter.email || "";
        contactType = "Writer";
        category = "writer_pitch";
      } else if (formData.sourceOfIdea === "external_producer") {
        contactName = formData.pocName.trim();
        contactEmail = ""; // No email for producers/in-house
        contactType = "External Producer";
        category = "external_producer";
      } else if (formData.sourceOfIdea === "in_house") {
        contactName = formData.pocName.trim();
        contactEmail = "";
        contactType = "In-house";
        category = "inhouse_content";
      }

      // Format datetime as local time string with timezone offset
      const [hours, minutes] = selectedTime.split(":").map(Number);

      const year = selectedDateTime.getFullYear();
      const month = String(selectedDateTime.getMonth() + 1).padStart(2, "0");
      const day = String(selectedDateTime.getDate()).padStart(2, "0");
      const hour = String(hours).padStart(2, "0");
      const minute = String(minutes).padStart(2, "0");

      // Include timezone offset so Supabase stores the correct local time
      const tzOffset = -selectedDateTime.getTimezoneOffset();
      const tzSign = tzOffset >= 0 ? "+" : "-";
      const tzHours = String(Math.floor(Math.abs(tzOffset) / 60)).padStart(2, "0");
      const tzMinutes = String(Math.abs(tzOffset) % 60).padStart(2, "0");
      const localDateTimeString = `${year}-${month}-${day}T${hour}:${minute}:00${tzSign}${tzHours}:${tzMinutes}`;

      // Map selected attendees - use email if available, otherwise use name for writers
      const attendeeIdentifiers = selectedAttendees.map(user =>
        user.email || `[Writer] ${user.name}`
      );

      // Create meeting
      await createSimpleMeetingClient({
        title: formData.title,
        meeting_date: localDateTimeString,
        duration_minutes: parseInt(formData.duration),
        location: formData.location,
        notes: formData.notes,
        contact_name: contactName,
        contact_email: contactEmail,
        contact_type: contactType,
        attendees: contactEmail ? [contactEmail, ...attendeeIdentifiers] : attendeeIdentifiers,
        category: category,
      });

      await clearDraft();
      toast.success("Meeting scheduled successfully!");

      // Close dialog and refresh calendar
      onOpenChange(false);
      onMeetingCreated();
    } catch (error: any) {
      console.error("Error scheduling meeting:", error);
      toast.error(
        `Failed to schedule meeting: ${error.message || "Please try again."}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!selectedDateTime) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Schedule Meeting</DialogTitle>
          <DialogDescription className="text-sm">
            {format(selectedDateTime, "EEEE, MMMM d, yyyy")} at {selectedTime}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 py-3 sm:py-4">
          {/* Draft restore banner */}
          {!draftDismissed && (
            <DraftRestoreBanner
              hasDraft={hasDraft}
              draftLoaded={draftLoaded}
              onRestore={handleRestoreDraft}
              onDiscard={handleDiscardDraft}
              lastUpdated={draftUpdatedAt}
            />
          )}

          {/* Time Picker */}
          <div className="space-y-2">
            <Label htmlFor="time">
              Meeting Time <span className="text-red-500">*</span>
            </Label>
            <Input
              id="time"
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              required
              className="text-sm"
            />
            {/* Quick time selection buttons */}
            <div className="flex gap-1.5 flex-wrap">
              {["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00"].map((time) => (
                <Button
                  key={time}
                  type="button"
                  variant={selectedTime === time ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-7 px-2"
                  onClick={() => setSelectedTime(time)}
                >
                  {time}
                </Button>
              ))}
            </div>
          </div>

          {/* Duration Picker */}
          <div className="space-y-2">
            <Label htmlFor="duration">
              Meeting Duration <span className="text-red-500">*</span>
            </Label>
            <Select
              onValueChange={handleDurationChange}
              value={formData.duration}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="90">1.5 hours</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
                <SelectItem value="180">3 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Source of Idea Dropdown */}
          <div className="space-y-2">
            <Label htmlFor="sourceOfIdea">
              Source of Idea <span className="text-red-500">*</span>
            </Label>
            <Select
              onValueChange={handleSourceChange}
              value={formData.sourceOfIdea}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select source of idea" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="writer">Writer</SelectItem>
                <SelectItem value="external_producer">External Producer</SelectItem>
                <SelectItem value="in_house">In-House</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Conditional Contact Field */}
          {formData.sourceOfIdea === "writer" && (
            <div className="space-y-2">
              <Label htmlFor="writer">
                Writer <span className="text-red-500">*</span>
              </Label>
              <WriterSelect
                value={formData.writerId}
                onChange={(writerId, writer) => {
                  setFormData(prev => ({ ...prev, writerId }));
                  setSelectedWriter(writer);
                }}
                disabled={isLoading}
                required={true}
                placeholder="Select a writer"
              />
            </div>
          )}

          {(formData.sourceOfIdea === "external_producer" || formData.sourceOfIdea === "in_house") && (
            <div className="space-y-2">
              <Label htmlFor="pocName">
                POC Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="pocName"
                placeholder="Enter point of contact name"
                value={formData.pocName}
                onChange={handleInputChange}
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">
              Meeting Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              placeholder="e.g., Story Pitch Discussion"
              value={formData.title}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="attendees">Additional Attendees</Label>
            <MentionInput
              selectedUsers={selectedAttendees}
              onUsersChange={setSelectedAttendees}
              placeholder="Type @ to mention users..."
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location/Platform</Label>
            <Input
              id="location"
              placeholder="e.g., Conference Room A, Zoom"
              value={formData.location}
              onChange={handleInputChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Meeting Agenda</Label>
            <Textarea
              id="notes"
              placeholder="Add agenda items or relevant details..."
              rows={3}
              value={formData.notes}
              onChange={handleInputChange}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Scheduling..." : "Schedule Meeting"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
