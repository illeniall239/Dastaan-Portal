"use client";

import { useState, useRef, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Image, X, Upload } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';

interface LoglineImageUploadProps {
  value?: string; // Existing image URL
  onChange: (imageUrl: string | null) => void;
  disabled?: boolean;
  entityId?: string; // call_report_id for storage path
}

export function LoglineImageUpload({
  value,
  onChange,
  disabled = false,
  entityId
}: LoglineImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(value || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const maxFileSize = 5; // 5MB
  const acceptedTypes = ['image/png', 'image/jpeg', 'image/jpg'];

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!acceptedTypes.includes(file.type)) {
      toast.error('Please upload a PNG, JPG, or JPEG image');
      return;
    }

    // Validate file size
    if (file.size > maxFileSize * 1024 * 1024) {
      toast.error(`Image must be less than ${maxFileSize}MB`);
      return;
    }

    await uploadImage(file);

    // Reset input
    e.target.value = '';
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      // Generate unique filename
      const fileExtension = file.name.split('.').pop();
      const fileName = `call_report_logline/${entityId || 'temp'}/${uuidv4()}.${fileExtension}`;

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('attachments')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);
        toast.error('Failed to upload image');
        return;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('attachments')
        .getPublicUrl(fileName);

      const imageUrl = publicUrlData.publicUrl;
      setPreviewUrl(imageUrl);
      onChange(imageUrl);
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!previewUrl) return;

    try {
      // Extract file path from URL
      const url = new URL(previewUrl);
      const pathMatch = url.pathname.match(/\/attachments\/(.+)$/);

      if (pathMatch) {
        const filePath = pathMatch[1];

        // Delete from storage
        await supabase.storage
          .from('attachments')
          .remove([filePath]);
      }

      setPreviewUrl(null);
      onChange(null);
      toast.success('Image removed');
    } catch (error) {
      console.error('Error removing image:', error);
      toast.error('Failed to remove image');
    }
  };

  const onButtonClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
        accept="image/png,image/jpeg,image/jpg"
        disabled={disabled || uploading}
      />

      {/* Upload Button - Positioned on Right */}
      {!previewUrl && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onButtonClick}
          disabled={disabled || uploading}
          className="absolute right-2 top-2"
          title="Upload logline image"
        >
          {uploading ? (
            <Upload className="h-4 w-4 animate-pulse" />
          ) : (
            <Image className="h-4 w-4" />
          )}
        </Button>
      )}

      {/* Preview Thumbnail */}
      {previewUrl && (
        <div className="relative inline-block mt-2">
          <img
            src={previewUrl}
            alt="Logline"
            className="h-24 w-24 object-cover rounded border border-gray-300"
          />
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleRemove}
            disabled={disabled}
            className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
            title="Remove image"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
