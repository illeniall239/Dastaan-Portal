"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { CalendarPicker } from "@/components/ui/calendar-picker";
import { MentionInput } from "@/components/ui/mention-input";
import { toast } from "sonner";
import { createMeetingClient } from "@/lib/meetings/client";
import { WriterSelect } from "@/components/writers/writer-select";
import { Clock, FileText, MapPin, Users } from "lucide-react";
import type { Writer } from "@/types";

interface User {
  id: string;
  name: string;
  email: string | null;
  role?: string;
  department?: string;
  type?: 'user' | 'writer';
}

export function ClientScheduleMeetingForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>("09:00");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedWriter, setSelectedWriter] = useState<Writer | undefined>();
  const [selectedAttendees, setSelectedAttendees] = useState<User[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    sourceOfIdea: "",
    writerId: "",
    pocName: "",
    title: "",
    notes: "",
    location: "",
    duration: "60"
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSourceChange = (value: string) => {
    setFormData(prev => ({ ...prev, sourceOfIdea: value, writerId: "", pocName: "" }));
    setSelectedWriter(undefined);
  };

  const handleDurationChange = (value: string) => {
    setFormData(prev => ({ ...prev, duration: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate form
      if (!formData.sourceOfIdea || !formData.title || !selectedDate) {
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
        contactEmail = "";
        contactType = "External Producer";
        category = "external_producer";
      } else if (formData.sourceOfIdea === "in_house") {
        contactName = formData.pocName.trim();
        contactEmail = "";
        contactType = "In-house";
        category = "inhouse_content";
      }

      // Combine date and time
      const meetingDateTime = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(":").map(Number);
      meetingDateTime.setHours(hours, minutes, 0, 0);

      // Format as local datetime string with timezone offset
      const year = meetingDateTime.getFullYear();
      const month = String(meetingDateTime.getMonth() + 1).padStart(2, '0');
      const day = String(meetingDateTime.getDate()).padStart(2, '0');
      const hour = String(meetingDateTime.getHours()).padStart(2, '0');
      const minute = String(meetingDateTime.getMinutes()).padStart(2, '0');

      // Include timezone offset so Supabase stores the correct local time
      const tzOffset = -meetingDateTime.getTimezoneOffset();
      const tzSign = tzOffset >= 0 ? "+" : "-";
      const tzHours = String(Math.floor(Math.abs(tzOffset) / 60)).padStart(2, "0");
      const tzMinutes = String(Math.abs(tzOffset) % 60).padStart(2, "0");
      const localDateTimeString = `${year}-${month}-${day}T${hour}:${minute}:00${tzSign}${tzHours}:${tzMinutes}`;

      // Map selected attendees - use email if available, otherwise use name for writers
      const attendeeIdentifiers = selectedAttendees.map(user =>
        user.email || `[Writer] ${user.name}`
      );

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
        meeting_date: localDateTimeString,
        duration_minutes: parseInt(formData.duration),
        attendees: contactEmail ? [contactEmail, ...attendeeIdentifiers] : attendeeIdentifiers,
        location: formData.location,
        notes: formData.notes,
        status: "draft",
        created_by: userId
      });

      toast.success("Meeting scheduled successfully!");
      router.push("/gcm/calendar");
    } catch (error: any) {
      console.error("Error scheduling meeting:", error);
      toast.error(`Failed to schedule meeting: ${error.message || "Please try again."}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Quick time selection options
  const timeSlots = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
    "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00"
  ];

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Date & Time */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Date & Time
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <CalendarPicker
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
            />

            {selectedDate && (
              <div className="space-y-2">
                <Label htmlFor="time">
                  Meeting Time <span className="text-red-500">*</span>
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {timeSlots.map((time) => (
                    <Button
                      key={time}
                      type="button"
                      variant={selectedTime === time ? "default" : "outline"}
                      size="sm"
                      className="text-xs"
                      onClick={() => setSelectedTime(time)}
                    >
                      {time}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Duration Picker */}
            <div className="space-y-2">
              <Label htmlFor="duration">
                Duration <span className="text-red-500">*</span>
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
          </CardContent>
        </Card>

        {/* Right Column - Meeting Details */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Meeting Details
            </CardTitle>
            <CardDescription>
              {selectedDate && (
                <span className="text-[#224794] font-medium">
                  {format(selectedDate, "EEEE, MMMM d, yyyy")} at {selectedTime}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Meeting Title */}
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

            {/* Source of Idea */}
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

            {/* Attendees */}
            <div className="space-y-2">
              <Label htmlFor="attendees" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Additional Attendees
              </Label>
              <MentionInput
                selectedUsers={selectedAttendees}
                onUsersChange={setSelectedAttendees}
                placeholder="Type @ to mention users..."
                disabled={isLoading}
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location/Platform
              </Label>
              <Input
                id="location"
                placeholder="e.g., Conference Room A, Zoom, Teams"
                value={formData.location}
                onChange={handleInputChange}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Meeting Notes / Agenda</Label>
              <Textarea
                id="notes"
                placeholder="Add any relevant details or agenda items..."
                rows={4}
                value={formData.notes}
                onChange={handleInputChange}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Scheduling..." : "Schedule Meeting"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
