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
import { CalendarPicker } from "@/components/ui/calendar-picker";
import { MentionInput } from "@/components/ui/mention-input";
import Link from "next/link";
import { toast } from "sonner";
import { createMeetingClient } from "@/lib/meetings/client";

interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  department?: string;
}

export function ClientScheduleMeetingForm({ writers, userId }: { writers: { id: string; name: string; email: string }[], userId: string }) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>("09:00");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAttendees, setSelectedAttendees] = useState<User[]>([]);

  // Form state - simple meeting fields only
  const [formData, setFormData] = useState({
    writerId: "",
    title: "",
    notes: "",
    location: ""
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({ ...prev, writerId: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate form
      if (!formData.writerId || !formData.title || !selectedDate) {
        toast.error("Please fill in all required fields");
        return;
      }

      // Find selected writer
      const selectedWriter = writers.find(w => w.id === formData.writerId);
      if (!selectedWriter) {
        toast.error("Please select a valid writer");
        return;
      }

      // Combine date and time
      const meetingDateTime = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(":").map(Number);
      meetingDateTime.setHours(hours, minutes, 0, 0);

      // Format as local datetime string (no timezone conversion)
      // This ensures 12:00 PM local stays as 12:00 PM in the database
      const year = meetingDateTime.getFullYear();
      const month = String(meetingDateTime.getMonth() + 1).padStart(2, '0');
      const day = String(meetingDateTime.getDate()).padStart(2, '0');
      const hour = String(meetingDateTime.getHours()).padStart(2, '0');
      const minute = String(meetingDateTime.getMinutes()).padStart(2, '0');
      const localDateTimeString = `${year}-${month}-${day}T${hour}:${minute}:00`;

      // Map selected attendees to email array
      const attendeeEmails = selectedAttendees.map(user => user.email);

      // Create meeting with minimal fields
      await createMeetingClient({
        meeting_type: "scheduled_meeting",
        logged_by: "",
        category: "writer_pitch",
        writer_name: selectedWriter.name,
        writer_email: selectedWriter.email,
        working_title: formData.title,
        logline: formData.notes,
        meeting_date: localDateTimeString,
        attendees: [selectedWriter.email, ...attendeeEmails],
        location: formData.location,
        notes: formData.notes,
        status: "draft",
        created_by: userId
      });

      toast.success("Meeting scheduled successfully!");

      // Reset form
      setFormData({
        writerId: "",
        title: "",
        notes: "",
        location: ""
      });
      setSelectedAttendees([]);
    } catch (error: any) {
      console.error("Error scheduling meeting:", error);
      toast.error(`Failed to schedule meeting: ${error.message || "Please try again."}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar and Time Picker */}
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Select Date & Time</CardTitle>
          </CardHeader>
          <CardContent>
            <CalendarPicker
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
            />

            {selectedDate && (
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2">Select Time</h3>
                <div className="grid grid-cols-3 gap-2">
                  {["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00"].map((time) => (
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
          </CardContent>
        </Card>
      </div>

      {/* Meeting Details Form */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Meeting Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="writer">Writer *</Label>
                <Select onValueChange={handleSelectChange} value={formData.writerId}>
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

              <div className="space-y-2">
                <Label htmlFor="title">Meeting Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Story Pitch Discussion"
                  value={formData.title}
                  onChange={handleInputChange}
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
                <Label htmlFor="notes">Meeting Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any relevant details about the meeting..."
                  rows={4}
                  value={formData.notes}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location/Platform</Label>
                <Input
                  id="location"
                  placeholder="e.g., Conference Room A, Zoom Meeting Link"
                  value={formData.location}
                  onChange={handleInputChange}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button asChild variant="outline" type="button">
                  <Link href="/content-department/calendar">Cancel</Link>
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Scheduling..." : "Schedule Meeting"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
