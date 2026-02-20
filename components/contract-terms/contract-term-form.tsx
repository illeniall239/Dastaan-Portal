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
import { Plus, X, PaperclipIcon, Trash2 } from "lucide-react";
import type { ProjectForContractTerm, ContractTerm } from "@/lib/contract-terms/client";
import type { DeliveryEpisode } from "@/lib/validations/contract-terms";
import { FileUpload } from "@/components/ui/file-upload";
import { uploadFile, getAttachmentsForEntity, deleteFile } from "@/lib/attachments/client";
import {
  RATE_RANGES,
  TIME_SLOTS,
  getEpisodeCountWarning,
} from "@/lib/validations/contract-terms";

interface ContractTermFormProps {
  stories: ProjectForContractTerm[];
  redirectPath: string;
  mode?: "create" | "edit";
  initialData?: ContractTerm;
}

export function ContractTermForm({ stories, redirectPath, mode = "create", initialData }: ContractTermFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Form state - initialize with initialData if in edit mode
  const [selectedStoryId, setSelectedStoryId] = useState(initialData?.story_id || "");
  const [writerName, setWriterName] = useState(initialData?.writer_producer_name || "");
  const [genre, setGenre] = useState(initialData?.genre || "");
  const [rateRange, setRateRange] = useState(initialData?.rate_range || "");
  const [proposedPrice, setProposedPrice] = useState(initialData?.agreed_price?.toString() || "");
  const [estimatedEpisodes, setEstimatedEpisodes] = useState(initialData?.estimated_episodes?.toString() || "");
  const [timeSlot, setTimeSlot] = useState(initialData?.suggested_time_slot || "");
  const [projectStartDate, setProjectStartDate] = useState(initialData?.project_start_date || "");
  const [completionDate, setCompletionDate] = useState(initialData?.expected_completion_date || "");
  const [paymentStructure, setPaymentStructure] = useState(initialData?.payment_structure || "");
  const [priceJustification, setPriceJustification] = useState(initialData?.price_justification || "");
  const [agreedTerms, setAgreedTerms] = useState(initialData?.agreed_terms || "");
  const [contractType, setContractType] = useState<"net" | "gross">("net");

  // Delivery schedule state (individual episodes)
  const [deliverySchedule, setDeliverySchedule] = useState<DeliveryEpisode[]>(
    initialData?.delivery_schedule && initialData.delivery_schedule.length > 0
      ? initialData.delivery_schedule
      : [{ episode_number: 1, episode_title: "", delivery_date: "" }]
  );

  // File upload state
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [existingAttachments, setExistingAttachments] = useState<any[]>([]);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);

  // Fetch existing attachments in edit mode
  useEffect(() => {
    if (mode === "edit" && initialData?.id) {
      getAttachmentsForEntity("negotiation", initialData.id)
        .then(setExistingAttachments)
        .catch((err) => console.error("Error fetching attachments:", err));
    }
  }, [mode, initialData?.id]);

  const handleFileUpload = (file: File) => {
    setFilesToUpload((prev) => [...prev, file]);
  };

  const handleFileRemove = (fileName: string) => {
    setFilesToUpload((prev) => prev.filter((f) => f.name !== fileName));
  };

  const handleDeleteExistingAttachment = async (attachmentId: string, filePath: string) => {
    setDeletingAttachmentId(attachmentId);
    try {
      await deleteFile(attachmentId, filePath);
      setExistingAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      toast.success("Attachment deleted");
    } catch (error) {
      console.error("Error deleting attachment:", error);
      toast.error("Failed to delete attachment");
    } finally {
      setDeletingAttachmentId(null);
    }
  };

  // Auto-populate writer name and genre when project is selected (only in create mode)
  useEffect(() => {
    if (mode === "create" && selectedStoryId) {
      const project = stories.find((s) => s.id === selectedStoryId);
      if (project) {
        setWriterName(project.writer_name);
        setGenre(project.genre || "");
      }
    } else if (mode === "create" && !selectedStoryId) {
      setWriterName("");
      setGenre("");
    }
  }, [selectedStoryId, stories, mode]);

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
    if (!proposedPrice || parseFloat(proposedPrice) <= 0) {
      toast.error("Please enter agreed price");
      return false;
    }
    if (!agreedTerms || agreedTerms.trim().length === 0) {
      toast.error("Please enter agreed terms");
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
      const url = mode === "edit" && initialData
        ? `/api/contract-terms/${initialData.id}`
        : "/api/contract-terms";

      const method = mode === "edit" ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...((() => {
            const project = stories.find(s => s.id === selectedStoryId);
            return project?.item_type === "call_report"
              ? { call_report_id: selectedStoryId }
              : { story_id: selectedStoryId };
          })()),
          writer_producer_name: writerName,
          genre,
          rate_range: rateRange,
          proposed_price: proposedPrice ? parseFloat(proposedPrice) : null,
          agreed_price: parseFloat(proposedPrice),
          agreed_terms: agreedTerms,
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
        throw new Error(data.error || (mode === "edit" ? "Failed to update negotiation" : "Failed to create negotiation"));
      }

      // Upload files after successful create/edit
      const negotiationId = mode === "edit" ? initialData!.id : data.negotiation?.id;
      if (filesToUpload.length > 0 && negotiationId) {
        for (const file of filesToUpload) {
          try {
            await uploadFile(file, "negotiation", negotiationId, (progress) => {
              setUploadProgress((prev) => ({ ...prev, [file.name]: progress }));
            });
            setUploadProgress((prev) => {
              const newProgress = { ...prev };
              delete newProgress[file.name];
              return newProgress;
            });
          } catch (uploadError) {
            console.error("Error uploading file:", uploadError);
            toast.error(`Failed to upload ${file.name}`);
          }
        }
      }

      toast.success(mode === "edit" ? "Contract term updated successfully!" : "Contract term created successfully!");
      router.push(redirectPath);
      router.refresh();
    } catch (error) {
      console.error(`Error ${mode === "edit" ? "updating" : "creating"} contractTerm:`, error);
      toast.error(error instanceof Error ? error.message : (mode === "edit" ? "Failed to update negotiation" : "Failed to create negotiation"));
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
            <Select
              value={selectedStoryId}
              onValueChange={setSelectedStoryId}
              disabled={mode === "edit"}
            >
              <SelectTrigger id="project" className={mode === "edit" ? "bg-muted" : ""}>
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {stories.length === 0 ? (
                  <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                    No approved projects available
                  </div>
                ) : (
                  stories.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.title} ({project.display_id})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {mode === "edit" ? "Project cannot be changed" : "Select from approved story ideas"}
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
            <Label htmlFor="proposedPrice">Agreed Price (PKR) *</Label>
            <Input
              id="proposedPrice"
              type="number"
              value={proposedPrice}
              onChange={(e) => setProposedPrice(e.target.value)}
              placeholder="Enter agreed amount"
              min="0"
              step="1000"
              required
            />
            <p className="text-sm text-muted-foreground">
              Final agreed price for this project
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

          <div className="space-y-2">
            <Label htmlFor="agreedTerms">Agreed Terms *</Label>
            <Textarea
              id="agreedTerms"
              value={agreedTerms}
              onChange={(e) => setAgreedTerms(e.target.value)}
              placeholder="Enter the final agreed terms and conditions for this project"
              rows={4}
              maxLength={5000}
              required
            />
            <p className="text-sm text-muted-foreground">
              Summary of all agreed terms and conditions
            </p>
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

      {/* Signed Copy / Attachments Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PaperclipIcon className="h-5 w-5" />
            Signed Copy / Attachments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload signed contract copies, term sheets, or other supporting documents.
          </p>

          {/* Existing attachments (edit mode) */}
          {existingAttachments.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Existing Attachments:</h4>
              {existingAttachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <PaperclipIcon className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="font-medium text-sm">{attachment.file_name}</p>
                      <p className="text-xs text-gray-500">
                        {(attachment.file_size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteExistingAttachment(attachment.id, attachment.file_path)}
                    disabled={deletingAttachmentId === attachment.id}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* New file upload */}
          <FileUpload
            onFileUpload={handleFileUpload}
            onFileRemove={handleFileRemove}
            uploadedFiles={filesToUpload}
            uploadProgress={uploadProgress}
            maxFileSize={20}
            acceptedFileTypes={['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx']}
          />
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
          {isLoading
            ? mode === "edit"
              ? "Updating..."
              : "Approving..."
            : mode === "edit"
            ? "Update ContractTerm"
            : "Approve Plan"}
        </Button>
      </div>
    </form>
  );
}
