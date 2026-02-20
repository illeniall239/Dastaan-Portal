"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
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
import { createMeetingClient, updateCallReportClient } from "@/lib/meetings/client";
import { FileUpload } from "@/components/ui/file-upload";
import { ContentRevisions } from "@/components/ui/content-revisions";
import { uploadFile } from "@/lib/attachments/client";
import { formatFileSize } from "@/lib/validations/episodes";
import { MentionInput } from "@/components/ui/mention-input";
import { ScoreCard } from "@/components/episodic-evaluations/score-card";
import { GenreMultiSelect } from "@/components/ui/genre-multi-select";
import { WriterMultiSelect } from "@/components/writers/writer-multi-select";
import { LoglineImageUpload } from "@/components/ui/logline-image-upload";
import { DirectorSelect } from "@/components/directors/director-select";
import type { Writer, CallReportWriter } from "@/types";
import { useFormAutosave } from "@/lib/hooks/useFormAutosave";
import { DraftRestoreBanner } from "@/components/ui/draft-restore-banner";

interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  department?: string;
}

interface AttachmentRecord {
  id: string;
  file_name: string;
  file_path: string;
  file_size?: number | null;
  file_type?: string | null;
  uploaded_at?: string | null;
  public_url?: string | null;
}

export function CallReportForm({
  mode = "create",
  initialData,
  callReportId,
  onSuccess,
  userId,
  userName,
  userPosition,
  initialAttachments,
}: {
  mode?: "create" | "edit";
  initialData?: any;
  callReportId?: string;
  onSuccess?: () => void;
  userId: string;
  userName: string;
  userPosition?: string;
  initialAttachments?: AttachmentRecord[];
}) {
  const router = useRouter();

  const memoizedInitialAttachments = useMemo(
    () => initialAttachments ?? [],
    [initialAttachments]
  );

  const [isLoading, setIsLoading] = useState(false);
  const [writers, setWriters] = useState<Array<{
    writer_id: string;
    writer_name: string;
    writer_email?: string;
    writer_phone?: string;
    display_order: number;
  }>>([]);
  const [loglineImageUrl, setLoglineImageUrl] = useState<string | null>(
    mode === "edit" && initialData?.logline_image_url ? initialData.logline_image_url : null
  );
  // Autosave
  const { hasDraft, draftLoaded, draftUpdatedAt, saveDraft, loadDraft, clearDraft } = useFormAutosave({
    formType: "call_report_content",
    entityId: callReportId || "_new",
    enabled: mode === "create",
  });

  const [draftDismissed, setDraftDismissed] = useState(false);

  // Form state — initialize from initialData in edit mode to avoid two-phase render
  const [formData, setFormData] = useState(() => {
    if (mode === "edit" && initialData) {
      return {
        category: initialData.category || "",
        writerId: "",
        suggestedWriter: initialData.suggested_writer || "",
        contactPhone: initialData.contact_phone || "",
        contactAddress: initialData.contact_address || "",
        workingTitle: initialData.working_title || "",
        director: initialData.director || "",
        totalEpisodes: initialData.total_episodes?.toString() || "",
        receivedEpisodes: initialData.received_episodes?.toString() || "",
        logline: initialData.logline || "",
        shortSynopsis: initialData.short_synopsis || "",
        episodicSynopsis: initialData.episodic_synopsis || "",
        genre: Array.isArray(initialData.genre) ? initialData.genre : (initialData.genre ? [initialData.genre] : []),
        theme: initialData.theme || "",
        targetSlot: initialData.target_slot || "",
        contentType: initialData.content_type || "",
        notes: initialData.meeting_notes || "",
        nextSteps: initialData.next_steps || "",
        status: initialData.status || "draft",
        overallRating: initialData.overall_rating || 5,
        ideaBy: initialData.idea_by || "",
        developedBy: initialData.developed_by || "",
        managementMemberName: initialData.management_member_name || "",
      };
    }
    return {
      category: "",
      writerId: "",
      suggestedWriter: "",
      contactPhone: "",
      contactAddress: "",
      workingTitle: "",
      director: "",
      totalEpisodes: "",
      receivedEpisodes: "",
      logline: "",
      shortSynopsis: "",
      episodicSynopsis: "",
      genre: [] as string[],
      theme: "",
      targetSlot: "",
      contentType: "",
      notes: "",
      nextSteps: "",
      status: "ready_for_evaluation",
      overallRating: 5,
      ideaBy: "",
      developedBy: "",
      managementMemberName: "",
    };
  });

  // File upload state
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [existingAttachments, setExistingAttachments] = useState<AttachmentRecord[]>(memoizedInitialAttachments);
  const [attachmentsMarkedForDeletion, setAttachmentsMarkedForDeletion] = useState<string[]>([]);

  useEffect(() => {
    console.log("📎 FORM - memoizedInitialAttachments updated:", memoizedInitialAttachments);
    setExistingAttachments(memoizedInitialAttachments);
    setAttachmentsMarkedForDeletion([]);
  }, [memoizedInitialAttachments]);

  const handleExistingAttachmentDownload = (attachment: AttachmentRecord) => {
    if (attachment.file_path) {
      // Use signed URL endpoint for secure file access
      window.open(`/api/attachments/download?path=${encodeURIComponent(attachment.file_path)}`, "_blank");
    } else {
      toast.error("Download link not available for this attachment.");
    }
  };

  const handleExistingAttachmentRemove = (attachment: AttachmentRecord) => {
    if (!attachment.id) {
      setExistingAttachments((prev) => prev.filter((a) => a.file_path !== attachment.file_path));
      return;
    }

    setAttachmentsMarkedForDeletion((prev) => [...prev, attachment.id as string]);
    setExistingAttachments((prev) => prev.filter((a) => a.id !== attachment.id));
    toast.info("Attachment marked for removal. Save to apply.", { duration: 4000 });
  };

  // Debug logging for edit mode (state is already initialized from initialData in useState)
  useEffect(() => {
    if (mode === "edit" && initialData) {
      console.log("📝 FORM - Edit mode, initialData loaded:", {
        category: initialData.category,
        genre: initialData.genre,
        target_slot: initialData.target_slot,
        content_type: initialData.content_type,
      });
    }
  }, [mode, initialData]);

  // Fetch writers when in edit mode
  useEffect(() => {
    if (mode === "edit" && callReportId) {
      const fetchWriters = async () => {
        try {
          const response = await fetch(`/api/call-reports/${callReportId}/writers`, { cache: "no-store" });
          if (response.ok) {
            const { writers: fetchedWriters } = await response.json();
            // Map to the format expected by WriterMultiSelect
            const mappedWriters = fetchedWriters?.map((w: any) => ({
              writer_id: w.writer_id,
              writer_name: w.writer_name,
              writer_email: w.writer_email,
              writer_phone: w.writer_phone,
              display_order: w.display_order,
            })) || [];
            setWriters(mappedWriters);
          }
        } catch (error) {
          console.error("Error fetching writers:", error);
        }
      };
      fetchWriters();
    }
  }, [mode, callReportId]);

  // Autosave on form state changes
  useEffect(() => {
    if (mode !== "create") return;
    saveDraft({
      ...formData,
      writers,
      loglineImageUrl,
    });
  }, [formData, writers, loglineImageUrl, saveDraft, mode]);

  const handleRestoreDraft = useCallback(async () => {
    const data = await loadDraft();
    if (data) {
      const d = data as Record<string, any>;
      setFormData({
        category: d.category || "",
        writerId: d.writerId || "",
        suggestedWriter: d.suggestedWriter || "",
        contactPhone: d.contactPhone || "",
        contactAddress: d.contactAddress || "",
        workingTitle: d.workingTitle || "",
        director: d.director || "",
        totalEpisodes: d.totalEpisodes || "",
        receivedEpisodes: d.receivedEpisodes || "",
        logline: d.logline || "",
        shortSynopsis: d.shortSynopsis || "",
        episodicSynopsis: d.episodicSynopsis || "",
        genre: d.genre || [],
        theme: d.theme || "",
        targetSlot: d.targetSlot || "",
        contentType: d.contentType || "",
        notes: d.notes || "",
        nextSteps: d.nextSteps || "",
        status: d.status || "ready_for_evaluation",
        overallRating: d.overallRating || 5,
        ideaBy: d.ideaBy || "",
        developedBy: d.developedBy || "",
        managementMemberName: d.managementMemberName || "",
      });
      if (d.writers) setWriters(d.writers);
      if (d.loglineImageUrl) setLoglineImageUrl(d.loglineImageUrl);
      setDraftDismissed(true);
      toast.success("Draft restored");
    }
  }, [loadDraft]);

  const handleDiscardDraft = useCallback(async () => {
    await clearDraft();
    setDraftDismissed(true);
  }, [clearDraft]);

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
      if (mode === "edit" && callReportId) {
        // Update existing call report
        const updateData = {
          writer_name: writers.length > 0 ? writers[0].writer_name : (formData.suggestedWriter || "In-house Content"), // Deprecated field
          contact_email: writers.length > 0 ? (writers[0].writer_email || "") : "", // Changed from writer_email to contact_email
          suggested_writer: formData.suggestedWriter || undefined,
          contact_phone: formData.contactPhone || undefined,
          contact_address: formData.contactAddress || undefined,
          working_title: formData.workingTitle || undefined,
          director: formData.director || undefined,
          total_episodes: formData.totalEpisodes ? parseInt(formData.totalEpisodes) : undefined,
          received_episodes: formData.receivedEpisodes ? parseInt(formData.receivedEpisodes) : undefined,
          logline: formData.logline || undefined,
          logline_image_url: loglineImageUrl || undefined,
          short_synopsis: formData.shortSynopsis || undefined,
          episodic_synopsis: formData.episodicSynopsis || undefined,
          genre: formData.genre,
          theme: formData.theme || undefined,
          target_slot: formData.targetSlot || undefined,
          content_type: (formData.contentType || undefined) as "Serial" | "Long Serial" | "Telefilm" | "Mini-serial" | "Ramadan Serial" | "Series Sitcom" | "Soap" | undefined,
          category: (formData.category || undefined) as "external_producer" | "writer_pitch" | "inhouse_content" | "content_head_initiative" | "given_by_management" | undefined,
          idea_by: formData.ideaBy || undefined,
          developed_by: formData.developedBy || undefined,
          management_member_name: formData.managementMemberName || undefined,
          meeting_notes: formData.notes || undefined,
          next_steps: formData.nextSteps || undefined,
          status: formData.status || undefined,
          attachments_to_delete: attachmentsMarkedForDeletion.length > 0 ? attachmentsMarkedForDeletion : undefined,
        };

        await updateCallReportClient(callReportId, updateData);

        // Update writers - first fetch existing, then delete removed ones, add new ones
        try {
          const response = await fetch(`/api/call-reports/${callReportId}/writers`);
          const { writers: existingWriters } = await response.json();

          // Delete writers that were removed
          const existingWriterIds = existingWriters.map((w: any) => w.writer_id);
          const currentWriterIds = writers.map(w => w.writer_id);
          const toDelete = existingWriters.filter((w: any) => !currentWriterIds.includes(w.writer_id));

          for (const writer of toDelete) {
            await fetch(`/api/call-reports/${callReportId}/writers/${writer.writer_id}`, {
              method: 'DELETE'
            });
          }

          // Add new writers
          const toAdd = writers.filter(w => !existingWriterIds.includes(w.writer_id));
          if (toAdd.length > 0) {
            await fetch(`/api/call-reports/${callReportId}/writers`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ writers: toAdd })
            });
          }

          // Update contact info for existing writers
          const toUpdate = writers.filter(w => existingWriterIds.includes(w.writer_id));
          for (const writer of toUpdate) {
            await fetch(`/api/call-reports/${callReportId}/writers/${writer.writer_id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                writer_email: writer.writer_email,
                writer_phone: writer.writer_phone
              })
            });
          }
        } catch (error) {
          console.error("Error updating writers:", error);
          toast.error("Call report updated but failed to update writers.");
        }

        // Upload new files if any
        if (filesToUpload.length > 0) {
          for (const file of filesToUpload) {
            try {
              await uploadFile(file, "call_report", callReportId, (progress) => {
                setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
              });
              // Remove from progress tracking when complete
              setUploadProgress(prev => {
                const newProgress = { ...prev };
                delete newProgress[file.name];
                return newProgress;
              });
            } catch (error) {
              console.error("Error uploading file:", error);
              toast.error(`Failed to upload file: ${file.name}. ${error instanceof Error ? error.message : 'Please try again.'}`);
              // Remove from progress tracking on error
              setUploadProgress(prev => {
                const newProgress = { ...prev };
                delete newProgress[file.name];
                return newProgress;
              });
            }
          }
          toast.success(`Writer Engagement Report updated successfully with ${filesToUpload.length} new attachment(s)!`);
        } else {
          toast.success("Writer Engagement Report updated successfully!");
        }

        setAttachmentsMarkedForDeletion([]);

        // Navigate or call callback
        if (onSuccess) {
          onSuccess();
        } else {
          router.push("/programmer/call-reports");
        }
      } else {
        // Create meeting/call report
        const result = await createMeetingClient({
          logged_by: userName,
          category: formData.category,
          writer_name: writers.length > 0 ? writers[0].writer_name : (formData.suggestedWriter || "In-house Content"), // Deprecated field
          writer_email: writers.length > 0 ? (writers[0].writer_email || "") : "", // Deprecated field (for create, kept for backward compatibility)
          suggested_writer: formData.suggestedWriter,
          contact_phone: formData.contactPhone,
          contact_address: formData.contactAddress,
          working_title: formData.workingTitle,
          director: formData.director || undefined,
          total_episodes: formData.totalEpisodes ? parseInt(formData.totalEpisodes) : undefined,
          received_episodes: formData.receivedEpisodes ? parseInt(formData.receivedEpisodes) : undefined,
          logline: formData.logline,
          logline_image_url: loglineImageUrl || undefined,
          short_synopsis: formData.shortSynopsis,
          episodic_synopsis: formData.episodicSynopsis,
          genre: formData.genre,
          theme: formData.theme || undefined,
          slot: formData.targetSlot,
          content_type: formData.contentType as "Serial" | "Long Serial" | "Telefilm" | "Mini-serial" | "Ramadan Serial" | "Series Sitcom" | "Soap" | undefined,
          idea_by: formData.ideaBy || undefined,
          developed_by: formData.developedBy || undefined,
          management_member_name: formData.managementMemberName || undefined,
          meeting_date: new Date().toISOString(),
          attendees: writers.map(w => w.writer_email).filter((email): email is string => !!email),
          notes: formData.notes,
          next_steps: formData.nextSteps,
          status: formData.status,
          created_by: userId,
        });

        // Add writers to call report
        if (result.id && writers.length > 0) {
          try {
            const response = await fetch(`/api/call-reports/${result.id}/writers`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ writers })
            });

            if (!response.ok) {
              throw new Error('Failed to add writers');
            }
          } catch (error) {
            console.error("Error adding writers:", error);
            toast.error("Call report created but failed to add writers. Please edit to add them.");
          }
        }

        // Upload files if any
        if (filesToUpload.length > 0 && result.id) {
          for (const file of filesToUpload) {
            try {
              await uploadFile(file, "call_report", result.id, (progress) => {
                setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
              });
              // Remove from progress tracking when complete
              setUploadProgress(prev => {
                const newProgress = { ...prev };
                delete newProgress[file.name];
                return newProgress;
              });
            } catch (error) {
              console.error("Error uploading file:", error);
              toast.error(`Failed to upload file: ${file.name}. ${error instanceof Error ? error.message : 'Please try again.'}`);
              // Remove from progress tracking on error
              setUploadProgress(prev => {
                const newProgress = { ...prev };
                delete newProgress[file.name];
                return newProgress;
              });
            }
          }
          toast.success(`Writer Engagement Report logged successfully with ${filesToUpload.length} attachment(s)!`);
        } else {
          toast.success("Writer Engagement Report logged successfully!");
        }

        // Clear autosave draft on success
        await clearDraft();

        // Redirect to call reports list with fresh data
        router.push("/programmer/call-reports");
        router.refresh(); // Force cache revalidation to show new report

        // Reset form
        setFormData({
          category: "",
          writerId: "",
          suggestedWriter: "",
          contactPhone: "",
          contactAddress: "",
          workingTitle: "",
          director: "",
          totalEpisodes: "",
          receivedEpisodes: "",
          logline: "",
          shortSynopsis: "",
          episodicSynopsis: "",
          genre: [],
          theme: "",
          targetSlot: "",
          contentType: "",
          notes: "",
          nextSteps: "",
          status: "ready_for_evaluation",
          overallRating: 5,
          ideaBy: "",
          developedBy: "",
          managementMemberName: ""
        });
        setWriters([]);
        setFilesToUpload([]);
      }
    } catch (error: any) {
      console.error(`Error ${mode === "edit" ? "updating" : "logging"} call report:`, error);
      toast.error(`Failed to ${mode === "edit" ? "update" : "log"} Writer Engagement Report: ${error.message || "Please try again."}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4 sm:space-y-6 md:space-y-8 max-w-4xl mx-auto px-0">
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
              <Label htmlFor="category">Source of Idea</Label>
              <Select onValueChange={(value) => handleSelectChange("category", value)} value={formData.category}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="external_producer">External Producer</SelectItem>
                  <SelectItem value="writer_pitch">Writer Pitch</SelectItem>
                  <SelectItem value="inhouse_content">In-house Content</SelectItem>
                  <SelectItem value="content_head_initiative">Content Head Initiative</SelectItem>
                  <SelectItem value="given_by_management">Given by Management</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Content Head Initiative Fields */}
            {formData.category === "content_head_initiative" && (
              <div className="space-y-4 border-l-4 border-blue-500 pl-4 bg-blue-50 p-4 rounded">
                <div className="space-y-2">
                  <Label htmlFor="ideaBy">Idea By *</Label>
                  <Input
                    id="ideaBy"
                    value={formData.ideaBy}
                    onChange={handleInputChange}
                    placeholder="Who originated this idea"
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="developedBy">Developed By *</Label>
                  <Input
                    id="developedBy"
                    value={formData.developedBy}
                    onChange={handleInputChange}
                    placeholder="Who developed this concept"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
            )}

            {/* Given by Management Field */}
            {formData.category === "given_by_management" && (
              <div className="space-y-4 border-l-4 border-purple-500 pl-4 bg-purple-50 p-4 rounded">
                <div className="space-y-2">
                  <Label htmlFor="managementMemberName">Management Member *</Label>
                  <Input
                    id="managementMemberName"
                    value={formData.managementMemberName}
                    onChange={handleInputChange}
                    placeholder="Which management member assigned this"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
            )}

            {/* Writers/Originators - shown for all sources */}
            <div className="space-y-2">
              <WriterMultiSelect
                value={writers}
                onChange={setWriters}
                required={false}
                disabled={isLoading}
                label="Writers/Originators"
              />
            </div>

            {/* Suggested Writer - shown for all sources */}
            <div className="space-y-2">
              <Label htmlFor="suggestedWriter">Suggested Writer</Label>
              <Input
                id="suggestedWriter"
                placeholder="If different from originator (optional)"
                value={formData.suggestedWriter}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="workingTitle">Working Title</Label>
                <Input
                  id="workingTitle"
                  placeholder="Story working title"
                  value={formData.workingTitle}
                  onChange={handleInputChange}
                />
              </div>
              <DirectorSelect
                value={formData.director}
                onChange={(val) => setFormData(prev => ({ ...prev, director: val }))}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="totalEpisodes">Total Episodes</Label>
                <Input
                  id="totalEpisodes"
                  type="number"
                  min="0"
                  placeholder="Total planned episodes"
                  value={formData.totalEpisodes}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="receivedEpisodes">Received Episodes</Label>
                <Input
                  id="receivedEpisodes"
                  type="number"
                  min="0"
                  placeholder="Episodes received so far"
                  value={formData.receivedEpisodes}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="logline">Logline</Label>
              <div className="relative">
                <Textarea
                  id="logline"
                  placeholder="Brief summary of the story in one or two sentences"
                  rows={3}
                  value={formData.logline}
                  onChange={handleInputChange}
                  className="pr-12"
                />
                <LoglineImageUpload
                  value={loglineImageUrl || undefined}
                  onChange={(url) => setLoglineImageUrl(url)}
                  disabled={isLoading}
                  entityId={callReportId}
                />
              </div>
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

            <GenreMultiSelect
              selectedGenres={formData.genre}
              onChange={(genres) => setFormData({ ...formData, genre: genres })}
              required={false}
              label="Genre"
            />

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
              <Label htmlFor="targetSlot">Target Slot</Label>
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

            <div className="space-y-2">
              <Label htmlFor="contentType">Content Type</Label>
              <Select onValueChange={(value) => handleSelectChange("contentType", value)} value={formData.contentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select content type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Serial">Serial</SelectItem>
                  <SelectItem value="Long Serial">Long Serial</SelectItem>
                  <SelectItem value="Telefilm">Telefilm</SelectItem>
                  <SelectItem value="Mini-serial">Mini-serial</SelectItem>
                  <SelectItem value="Ramadan Serial">Ramadan Serial</SelectItem>
                  <SelectItem value="Series Sitcom">Series Sitcom</SelectItem>
                  <SelectItem value="Soap">Soap</SelectItem>
                </SelectContent>
              </Select>
            </div>

          </CardContent>
        </Card>

        {/* Section 4: Additional Notes */}
        <Card>
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="text-base sm:text-lg">Additional Notes</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0 space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional notes or context..."
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

        {/* Existing Attachments (Edit Mode) */}
        {mode === "edit" && (
          <Card>
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <CardTitle className="text-base sm:text-lg">Existing Attachments</CardTitle>
              {attachmentsMarkedForDeletion.length > 0 && (
                <p className="text-xs text-amber-600">
                  {attachmentsMarkedForDeletion.length} attachment
                  {attachmentsMarkedForDeletion.length > 1 ? "s" : ""} will be deleted after you save.
                </p>
              )}
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
              {existingAttachments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No attachments uploaded for this report yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {existingAttachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between gap-3 border rounded p-3 flex-wrap"
                    >
                      <div>
                        <p className="text-sm font-medium">{attachment.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {attachment.file_type || "Unknown type"} •{" "}
                          {attachment.file_size
                            ? formatFileSize(attachment.file_size)
                            : "Unknown size"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExistingAttachmentDownload(attachment)}
                        >
                          Download
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExistingAttachmentRemove(attachment)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Revisions (Edit Mode) */}
        {mode === "edit" && callReportId && (
          <ContentRevisions
            entityId={callReportId}
            apiBasePath="/api/call-reports"
            storageBucket="attachments"
            canEdit={true}
          />
        )}

        {/* File Upload Section */}
        <FileUpload
          onFileUpload={handleFileUpload}
          onFileRemove={handleFileRemove}
          uploadedFiles={filesToUpload}
          uploadProgress={uploadProgress}
          maxFileSize={20}
          acceptedFileTypes={['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt', '.jpeg', '.jpg', '.png']}
        />

        {/* Form Actions - sticky on mobile */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 sticky bottom-0 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 p-3 sm:p-0 sm:static sm:bg-transparent sm:backdrop-blur-0">
          <Button asChild variant="outline" type="button" className="touch-target">
            <Link href="/content-department">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isLoading} className="touch-target">
            <span className="hidden sm:inline">{isLoading ? "Saving..." : mode === "edit" ? "Update Writer Engagement Report" : "Log Writer Engagement Report"}</span>
            <span className="sm:hidden">{isLoading ? "Saving..." : mode === "edit" ? "Update Report" : "Log Report"}</span>
          </Button>
        </div>
      </div>
    </form>
  );
}
