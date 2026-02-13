"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { EpisodeFileUpload } from "@/components/episodes/episode-file-upload";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Trash2,
  Download,
  FileText,
  History,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { formatDate } from "@/lib/utils/format-date";
import type { EpisodeRevision } from "@/types";

interface ContentRevisionsProps {
  entityId: string;
  /** API base path, e.g. "/api/episodes" or "/api/detailed-one-liner" */
  apiBasePath: string;
  /** Storage bucket name, e.g. "episodes" or "attachments" */
  storageBucket?: string;
  /** Storage path prefix for uploads, e.g. the sourceId */
  sourceId?: string | null;
  canEdit: boolean;
  compact?: boolean;
}

export function ContentRevisions({
  entityId,
  apiBasePath,
  storageBucket = "attachments",
  sourceId,
  canEdit,
  compact = false,
}: ContentRevisionsProps) {
  const supabase = createClient();

  const [revisions, setRevisions] = useState<EpisodeRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(!compact);

  const [file, setFile] = useState<File | null>(null);
  const [comment, setComment] = useState("");

  const revisionsUrl = `${apiBasePath}/${entityId}/revisions`;

  const fetchRevisions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${revisionsUrl}?_t=${Date.now()}`, {
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch revisions");
      }
      setRevisions(data.revisions || []);
    } catch (error: any) {
      console.error("Error fetching revisions:", error);
    } finally {
      setLoading(false);
    }
  }, [revisionsUrl]);

  useEffect(() => {
    fetchRevisions();
  }, [fetchRevisions]);

  const handleAddRevision = async () => {
    if (!file && !comment.trim()) {
      toast.error("Please upload a file or add a comment");
      return;
    }

    setSubmitting(true);
    try {
      let attachment_url: string | null = null;
      let attachment_name: string | null = null;
      let attachment_type: string | null = null;

      if (file) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const storagePath = `${sourceId || entityId}/revisions/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from(storageBucket)
          .upload(storagePath, file);

        if (uploadError) {
          throw new Error(`Failed to upload file: ${uploadError.message}`);
        }

        const { data: urlData } = supabase.storage
          .from(storageBucket)
          .getPublicUrl(storagePath);

        attachment_url = urlData.publicUrl;
        attachment_name = file.name;
        attachment_type = file.type;
      }

      const response = await fetch(revisionsUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attachment_url,
          attachment_name,
          attachment_type,
          comment: comment.trim() || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create revision");
      }

      toast.success(`Revision ${data.revision.revision_number} added`);
      setFile(null);
      setComment("");
      setShowAddForm(false);
      fetchRevisions();
    } catch (error: any) {
      console.error("Error adding revision:", error);
      toast.error(error.message || "Failed to add revision");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRevision = async (revision: EpisodeRevision) => {
    setDeletingId(revision.id);
    try {
      const response = await fetch(`${revisionsUrl}/${revision.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete revision");
      }

      toast.success(`Revision ${revision.revision_number} deleted`);
      fetchRevisions();
    } catch (error: any) {
      console.error("Error deleting revision:", error);
      toast.error(error.message || "Failed to delete revision");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = (revision: EpisodeRevision) => {
    if (revision.attachment_url) {
      window.open(revision.attachment_url, "_blank");
    }
  };

  const renderAddForm = (size: "sm" | "default" = "default") => (
    <div
      className={
        size === "sm"
          ? "space-y-3 p-3 border rounded-md bg-white"
          : "space-y-4 p-4 border-2 border-dashed rounded-lg"
      }
    >
      {size === "default" && (
        <h4 className="text-sm font-medium">
          New Revision{" "}
          <span className="text-muted-foreground font-normal">
            (#{revisions.length + 1})
          </span>
        </h4>
      )}

      <div className={size === "default" ? "space-y-2" : ""}>
        {size === "default" && <Label>Upload Revised File</Label>}
        <EpisodeFileUpload
          file={file}
          onFileSelect={setFile}
          onFileRemove={() => setFile(null)}
          disabled={submitting}
        />
      </div>

      <div className={size === "default" ? "space-y-2" : ""}>
        {size === "default" && (
          <Label htmlFor="revision-comment">Revision Comments</Label>
        )}
        <Textarea
          id={size === "default" ? "revision-comment" : undefined}
          placeholder="Describe what was revised in this version..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={size === "sm" ? 2 : 3}
          maxLength={5000}
          disabled={submitting}
          className={size === "sm" ? "text-sm" : "resize-none"}
        />
        {size === "default" && (
          <p className="text-xs text-muted-foreground">
            {comment.length}/5000 characters
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          size={size}
          onClick={handleAddRevision}
          disabled={submitting || (!file && !comment.trim())}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
              {size === "default" ? "Uploading..." : ""}
            </>
          ) : (
            <>
              {size === "default" && <Plus className="h-4 w-4 mr-2" />}
              {size === "default" ? "Submit Revision" : "Submit"}
            </>
          )}
        </Button>
        <Button
          size={size}
          variant={size === "sm" ? "ghost" : "outline"}
          onClick={() => {
            setShowAddForm(false);
            setFile(null);
            setComment("");
          }}
          disabled={submitting}
        >
          Cancel
        </Button>
      </div>
    </div>
  );

  // Compact mode
  if (compact) {
    return (
      <div className="space-y-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <History className="h-4 w-4" />
          <span>
            {loading
              ? "Loading revisions..."
              : `${revisions.length} Revision${revisions.length !== 1 ? "s" : ""}`}
          </span>
        </button>

        {expanded && !loading && revisions.length > 0 && (
          <div className="ml-6 space-y-2">
            {revisions.map((revision) => (
              <div
                key={revision.id}
                className="flex items-start gap-3 p-2 rounded-md bg-slate-50 text-sm"
              >
                <Badge variant="outline" className="flex-shrink-0 text-xs">
                  Rev {revision.revision_number}
                </Badge>
                <div className="flex-1 min-w-0">
                  {revision.attachment_name && (
                    <button
                      onClick={() => handleDownload(revision)}
                      className="text-blue-600 hover:underline flex items-center gap-1 text-xs"
                    >
                      <FileText className="h-3 w-3" />
                      <span className="truncate">
                        {revision.attachment_name}
                      </span>
                    </button>
                  )}
                  {revision.comment && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {revision.comment}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {revision.uploaded_by_user?.name || "Unknown"} &middot;{" "}
                    {formatDate(revision.created_at)}
                  </p>
                </div>
              </div>
            ))}
            {canEdit && !showAddForm && (
              <Button
                size="sm"
                variant="outline"
                className="ml-0 mt-1"
                onClick={() => setShowAddForm(true)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Revision
              </Button>
            )}
            {showAddForm && canEdit && renderAddForm("sm")}
          </div>
        )}

        {expanded && !loading && revisions.length === 0 && canEdit && (
          <div className="ml-6">
            {!showAddForm ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddForm(true)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add First Revision
              </Button>
            ) : (
              renderAddForm("sm")
            )}
          </div>
        )}
      </div>
    );
  }

  // Full view
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-5 w-5" />
            Revisions
            {!loading && (
              <Badge variant="secondary" className="ml-1">
                {revisions.length}
              </Badge>
            )}
          </CardTitle>
          {canEdit && !showAddForm && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Revision
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading revisions...
          </div>
        ) : revisions.length === 0 && !showAddForm ? (
          <div className="text-center py-6">
            <History className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-3">
              No revisions yet
            </p>
            {canEdit && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddForm(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add First Revision
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {revisions.map((revision) => (
              <div
                key={revision.id}
                className="flex items-start gap-4 p-4 border rounded-lg bg-slate-50/50"
              >
                <Badge variant="secondary" className="flex-shrink-0 mt-0.5">
                  Revision {revision.revision_number}
                </Badge>
                <div className="flex-1 min-w-0 space-y-1.5">
                  {revision.attachment_name && (
                    <button
                      onClick={() => handleDownload(revision)}
                      className="text-blue-600 hover:underline flex items-center gap-1.5 text-sm"
                    >
                      <FileText className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">
                        {revision.attachment_name}
                      </span>
                    </button>
                  )}
                  {revision.comment && (
                    <p className="text-sm text-foreground">{revision.comment}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Uploaded by{" "}
                    {revision.uploaded_by_user?.name || "Unknown"} &middot;{" "}
                    {formatDate(revision.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {revision.attachment_url && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDownload(revision)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                  {canEdit && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteRevision(revision)}
                      disabled={deletingId === revision.id}
                    >
                      {deletingId === revision.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {showAddForm && canEdit && renderAddForm("default")}
      </CardContent>
    </Card>
  );
}
