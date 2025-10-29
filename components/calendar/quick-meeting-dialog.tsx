"use client";

import { useState, useEffect } from "react";
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
import { createMeetingClient } from "@/lib/meetings/client";

interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  department?: string;
}

interface QuickMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDateTime: Date | null;
  onMeetingCreated: () => void;
  userId: string;
}

// Mock writers data - in production, fetch from database
const writers = [
  { id: "1", name: "Ahmed Khan", email: "ahmed@example.com" },
  { id: "2", name: "Fatima Ali", email: "fatima@example.com" },
  { id: "3", name: "Omar Siddiqui", email: "omar@example.com" },
  { id: "4", name: "Zainab Raza", email: "zainab@example.com" },
];

export function QuickMeetingDialog({
  open,
  onOpenChange,
  selectedDateTime,
  onMeetingCreated,
  userId,
}: QuickMeetingDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAttendees, setSelectedAttendees] = useState<User[]>([]);
  const [formData, setFormData] = useState({
    sourceOfIdea: "",
    writerId: "",
    pocName: "",
    title: "",
    notes: "",
    location: "",
  });

  // Reset form when dialog opens with new date
  useEffect(() => {
    if (open && selectedDateTime) {
      setFormData({
        sourceOfIdea: "",
        writerId: "",
        pocName: "",
        title: "",
        notes: "",
        location: "",
      });
      setSelectedAttendees([]);
    }
  }, [open, selectedDateTime]);

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
        const selectedWriter = writers.find((w) => w.id === formData.writerId);
        if (!selectedWriter) {
          toast.error("Please select a valid writer");
          setIsLoading(false);
          return;
        }
        contactName = selectedWriter.name;
        contactEmail = selectedWriter.email;
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

      // Format datetime as local time string (no timezone conversion)
      const year = selectedDateTime.getFullYear();
      const month = String(selectedDateTime.getMonth() + 1).padStart(2, "0");
      const day = String(selectedDateTime.getDate()).padStart(2, "0");
      const hour = String(selectedDateTime.getHours()).padStart(2, "0");
      const minute = String(selectedDateTime.getMinutes()).padStart(2, "0");
      const localDateTimeString = `${year}-${month}-${day}T${hour}:${minute}:00`;

      // Map selected attendees to email array
      const attendeeEmails = selectedAttendees.map(user => user.email);

      // Create meeting
      await createMeetingClient({
        meeting_type: "scheduled_meeting",
        logged_by: "",
        category: category,
        writer_name: contactName,
        writer_email: contactEmail,
        contact_type: contactType,
        working_title: formData.title,
        logline: formData.notes,
        // keep deprecated fields empty to satisfy legacy not-null until migration
        // target_audience removed
        meeting_date: localDateTimeString,
        attendees: contactEmail ? [contactEmail, ...attendeeEmails] : attendeeEmails,
        location: formData.location,
        notes: formData.notes,
        status: "draft",
        created_by: userId,
      });

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
            {format(selectedDateTime, "EEEE, MMMM d, yyyy 'at' h:mm a")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 py-3 sm:py-4">
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
              <Select
                onValueChange={handleWriterChange}
                value={formData.writerId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a writer" />
                </SelectTrigger>
                <SelectContent>
                  {writers.map((writer) => (
                    <SelectItem key={writer.id} value={writer.id}>
                      {writer.name} ({writer.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <Label htmlFor="notes">Meeting Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add any relevant details..."
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
