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
import Link from "next/link";
import { toast } from "sonner";
import { createMeetingClient } from "@/lib/meetings/client";
import { FileUpload } from "@/components/ui/file-upload";
import { uploadFile } from "@/lib/attachments/client";
import { MentionInput } from "@/components/ui/mention-input";

interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  department?: string;
}

export function CallReportForm({
  writers,
  userId,
  userName,
  userPosition
}: {
  writers: { id: string; name: string; email: string }[],
  userId: string,
  userName: string,
  userPosition?: string
}) {
  // Format today's date for input default value (YYYY-MM-DD)
  const today = new Date().toISOString().split('T')[0];
  const [meetingDate, setMeetingDate] = useState<string>(today);
  const [meetingTime, setMeetingTime] = useState<string>("09:00");
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    category: "",
    writerId: "",
    suggestedWriter: "",
    contactPhone: "",
    contactAddress: "",
    workingTitle: "",
    logline: "",
    shortSynopsis: "",
    episodicSynopsis: "",
    genre: "",
    theme: "",
    targetSlot: "",
    location: "",
    notes: "",
    nextSteps: "",
    status: "draft"
  });

  // Attendees state
  const [selectedAttendees, setSelectedAttendees] = useState<User[]>([]);

  // File upload state
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (file: File) => {
    setFilesToUpload(prev => [...prev, file]);
  };

  const handleFileRemove = (fileName: string) => {
    setFilesToUpload(prev => prev.filter(f => f.name !== fileName));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate required fields
      if (!formData.category) {
        toast.error("Please select a category");
        return;
      }
      if (formData.category !== "inhouse_content" && !formData.writerId) {
        toast.error("Please select a writer");
        return;
      }
      if (!formData.workingTitle) {
        toast.error("Please enter a working title");
        return;
      }
      if (!formData.logline) {
        toast.error("Please enter a logline");
        return;
      }
      // Genre required
      if (!formData.genre) {
        toast.error("Please select a genre");
        return;
      }
      if (!formData.targetSlot) {
        toast.error("Please select a target slot");
        return;
      }
      if (!meetingDate) {
        toast.error("Please select a meeting date");
        return;
      }
      if (!meetingTime) {
        toast.error("Please select a meeting time");
        return;
      }

      // Find selected writer (only required for non-inhouse content)
      let selectedWriter = null;
      if (formData.category !== "inhouse_content") {
        selectedWriter = writers.find(w => w.id === formData.writerId);
        if (!selectedWriter) {
          toast.error("Please select a valid writer");
          return;
        }
      }

      // Combine date and time
      const meetingDateTime = new Date(`${meetingDate}T${meetingTime}`);

      // Extract attendee emails from selected users
      const attendeeEmails = selectedAttendees.map(user => user.email);

      // Create meeting/call report
      const result = await createMeetingClient({
        meeting_type: "call_report",
        logged_by: userName,
        category: formData.category,
        writer_name: selectedWriter?.name || formData.suggestedWriter || "In-house Content",
        writer_email: selectedWriter?.email || "",
        suggested_writer: formData.suggestedWriter,
        contact_phone: formData.contactPhone,
        contact_address: formData.contactAddress,
        working_title: formData.workingTitle,
        logline: formData.logline,
        short_synopsis: formData.shortSynopsis,
        episodic_synopsis: formData.episodicSynopsis,
        genre: formData.genre,
        theme: formData.theme || undefined,
        slot: formData.targetSlot,
        meeting_date: meetingDateTime.toISOString(),
        attendees: selectedWriter?.email ? [selectedWriter.email, ...attendeeEmails] : attendeeEmails,
        location: formData.location,
        notes: formData.notes,
        next_steps: formData.nextSteps,
        status: formData.status,
        created_by: userId
      });

      // Upload files if any
      if (filesToUpload.length > 0 && result.id) {
        for (const file of filesToUpload) {
          try {
            await uploadFile(file, "call_report", result.id);
          } catch (error) {
            console.error("Error uploading file:", error);
            toast.error(`Failed to upload file: ${file.name}. ${error instanceof Error ? error.message : 'Please try again.'}`);
          }
        }
        toast.success(`Writer Engagement Report logged successfully with ${filesToUpload.length} attachment(s)!`);
      } else {
        toast.success("Writer Engagement Report logged successfully!");
      }

      // Reset form
      setFormData({
        category: "",
        writerId: "",
        suggestedWriter: "",
        contactPhone: "",
        contactAddress: "",
        workingTitle: "",
        logline: "",
        shortSynopsis: "",
        episodicSynopsis: "",
        genre: "",
        theme: "",
        targetSlot: "",
        location: "",
        notes: "",
        nextSteps: "",
        status: "draft"
      });
      setSelectedAttendees([]);
      setFilesToUpload([]);
    } catch (error: any) {
      console.error("Error logging call report:", error);
      toast.error(`Failed to log Writer Engagement Report: ${error.message || "Please try again."}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4 sm:space-y-6 md:space-y-8 max-w-4xl mx-auto px-0">
        {/* Section 0: When Meeting Occurred */}
        <Card>
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="text-base sm:text-lg">When did the meeting occur?</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="meetingDate">Date *</Label>
                <Input
                  id="meetingDate"
                  type="date"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meetingTime">Time *</Label>
                <Input
                  id="meetingTime"
                  type="time"
                  value={meetingTime}
                  onChange={(e) => setMeetingTime(e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 1: Basic Information */}
        <Card>
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="text-base sm:text-lg">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0 space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <Label htmlFor="loggedBy">Logged By</Label>
              <Input
                id="loggedBy"
                value={userPosition ? `${userName} - ${userPosition}` : userName}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Source of Idea *</Label>
              <Select onValueChange={(value) => handleSelectChange("category", value)} value={formData.category}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="external_producer">External Producer</SelectItem>
                  <SelectItem value="writer_pitch">Writer Pitch</SelectItem>
                  <SelectItem value="inhouse_content">In-house Content</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Only show Writer/Originator field when NOT In-house Content */}
            {formData.category !== "inhouse_content" && (
              <div className="space-y-2">
                <Label htmlFor="writer">Writer/Originator Name *</Label>
                <Select onValueChange={(value) => handleSelectChange("writerId", value)} value={formData.writerId}>
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

            {/* Only show Suggested Writer field when source is In-house Content */}
            {formData.category === "inhouse_content" && (
              <div className="space-y-2">
                <Label htmlFor="suggestedWriter">Suggested Writer</Label>
                <Input
                  id="suggestedWriter"
                  placeholder="If different from originator"
                  value={formData.suggestedWriter}
                  onChange={handleInputChange}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 2: Contact Information */}
        <Card>
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="text-base sm:text-lg">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0 space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input
                id="contactPhone"
                placeholder="+92 XXX XXXXXXX"
                value={formData.contactPhone}
                onChange={handleInputChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactAddress">Contact Address</Label>
              <Textarea
                id="contactAddress"
                placeholder="Full address"
                rows={2}
                value={formData.contactAddress}
                onChange={handleInputChange}
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Story Details */}
        <Card>
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="text-base sm:text-lg">Story Details (One-Liner)</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0 space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workingTitle">Working Title *</Label>
              <Input
                id="workingTitle"
                placeholder="Story working title"
                value={formData.workingTitle}
                onChange={handleInputChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="logline">Logline *</Label>
              <Textarea
                id="logline"
                placeholder="Brief summary of the story in one or two sentences"
                rows={3}
                value={formData.logline}
                onChange={handleInputChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shortSynopsis">Short Synopsis</Label>
              <Textarea
                id="shortSynopsis"
                placeholder="A brief overview of the story, characters, and main plot points..."
                rows={5}
                value={formData.shortSynopsis}
                onChange={handleInputChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="episodicSynopsis">Episodic Synopsis</Label>
              <Textarea
                id="episodicSynopsis"
                placeholder="Episode-by-episode breakdown or arc description..."
                rows={5}
                value={formData.episodicSynopsis}
                onChange={handleInputChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="genre">Genre *</Label>
              <Input
                id="genre"
                placeholder="e.g., Drama, Comedy, Thriller"
                value={formData.genre}
                onChange={handleInputChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="theme">Theme</Label>
              <Input
                id="theme"
                placeholder="Central theme of the story"
                value={formData.theme}
                onChange={handleInputChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetSlot">Target Slot *</Label>
              <Select onValueChange={(value) => handleSelectChange("targetSlot", value)} value={formData.targetSlot}>
                <SelectTrigger>
                  <SelectValue placeholder="Select slot" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6:00 PM">6:00 PM</SelectItem>
                  <SelectItem value="7:00 PM">7:00 PM</SelectItem>
                  <SelectItem value="8:00 PM">8:00 PM</SelectItem>
                  <SelectItem value="9:00 PM">9:00 PM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Meeting Details */}
        <Card>
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="text-base sm:text-lg">Meeting Information</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0 space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <Label htmlFor="attendees">Meeting Attendees</Label>
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
                placeholder="e.g., Conference Room A, Zoom Meeting Link"
                value={formData.location}
                onChange={handleInputChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Meeting Notes *</Label>
              <Textarea
                id="notes"
                placeholder="Detailed notes from the meeting..."
                rows={4}
                value={formData.notes}
                onChange={handleInputChange}
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 5: Follow-up */}
        <Card>
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="text-base sm:text-lg">Follow-up</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
            <div className="space-y-2">
              <Label htmlFor="nextSteps">Next Steps/Action</Label>
              <Textarea
                id="nextSteps"
                placeholder="What are the next steps or action items?"
                rows={3}
                value={formData.nextSteps}
                onChange={handleInputChange}
              />
            </div>
          </CardContent>
        </Card>

        {/* File Upload Section */}
        <FileUpload
          onFileUpload={handleFileUpload}
          onFileRemove={handleFileRemove}
          uploadedFiles={filesToUpload}
          maxFileSize={20}
          acceptedFileTypes={['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt', '.jpeg', '.jpg', '.png']}
        />

        {/* Form Actions - sticky on mobile */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 sticky bottom-0 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 p-3 sm:p-0 sm:static sm:bg-transparent sm:backdrop-blur-0">
          <Button asChild variant="outline" type="button" className="touch-target">
            <Link href="/content-department">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isLoading} className="touch-target">
            <span className="hidden sm:inline">{isLoading ? "Saving..." : "Log Writer Engagement Report"}</span>
            <span className="sm:hidden">{isLoading ? "Saving..." : "Log Report"}</span>
          </Button>
        </div>
      </div>
    </form>
  );
}
