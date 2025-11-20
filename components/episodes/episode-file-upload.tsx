"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, X, FileText, Image as ImageIcon, File, Download } from "lucide-react";
import {
  ALLOWED_EPISODE_FILE_TYPES,
  MAX_EPISODE_FILE_SIZE,
  formatFileSize,
  isValidEpisodeFileType,
  isValidEpisodeFileSize,
} from "@/lib/validations/episodes";

interface EpisodeFileUploadProps {
  file: File | null;
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  disabled?: boolean;
  existingFileName?: string;
  existingFileUrl?: string;
  onExistingFileDownload?: () => void;
}

export function EpisodeFileUpload({
  file,
  onFileSelect,
  onFileRemove,
  disabled = false,
  existingFileName,
  existingFileUrl,
  onExistingFileDownload,
}: EpisodeFileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (selectedFile: File) => {
    // Validate file type
    if (!isValidEpisodeFileType(selectedFile.name)) {
      toast.error(`Invalid file type. Allowed: ${ALLOWED_EPISODE_FILE_TYPES.join(", ")}`);
      return;
    }

    // Validate file size
    if (!isValidEpisodeFileSize(selectedFile.size)) {
      toast.error(`File too large. Maximum size: ${formatFileSize(MAX_EPISODE_FILE_SIZE)}`);
      return;
    }

    onFileSelect(selectedFile);
    toast.success("File selected");
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (disabled) return;

    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
      e.target.value = ""; // Reset to allow same file again
    }
  };

  const onButtonClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png"].includes(extension || "")) {
      return <ImageIcon className="h-6 w-6" />;
    } else if (extension === "txt") {
      return <FileText className="h-6 w-6" />;
    } else {
      return <File className="h-6 w-6" />;
    }
  };

  const renderExistingFile = () => (
    <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-gray-600">{getFileIcon(existingFileName || "file")}</div>
          <div>
            <p className="text-sm font-medium text-gray-900">{existingFileName}</p>
            <p className="text-xs text-gray-500">Previously uploaded</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {existingFileUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onExistingFileDownload?.();
              }}
              disabled={disabled}
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          )}
          {!disabled && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onFileRemove();
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onButtonClick}
          disabled={disabled}
        >
          Replace File
        </Button>
      </div>
    </div>
  );

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={ALLOWED_EPISODE_FILE_TYPES.join(",")}
        onChange={handleChange}
        disabled={disabled}
      />

      {!file && existingFileName ? (
        renderExistingFile()
      ) : !file ? (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragActive
              ? "border-primary bg-primary/5"
              : "border-gray-300 hover:border-gray-400"
          } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={onButtonClick}
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-3" />
          <p className="text-sm text-gray-600 mb-1">
            <span className="font-semibold">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-gray-500">
            PDF, TXT, PPT, PPTX, DOCX, JPG, PNG (max {formatFileSize(MAX_EPISODE_FILE_SIZE)})
          </p>
        </div>
      ) : (
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-gray-600">{getFileIcon(file.name)}</div>
              <div>
                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
              </div>
            </div>
            {!disabled && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onFileRemove();
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
