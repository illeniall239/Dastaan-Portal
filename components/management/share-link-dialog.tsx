"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Copy, CheckCircle, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";

interface ShareLinkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contentType: "episode" | "one_liner";
  contentId: string;
  contentTitle: string;
}

export function ShareLinkDialog({
  isOpen,
  onClose,
  contentType,
  contentId,
  contentTitle,
}: ShareLinkDialogProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [maxSubmissions, setMaxSubmissions] = useState<number | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);

    try {
      const response = await fetch("/api/management/external/generate-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_type: contentType,
          content_id: contentId,
          expires_in_days: expiresInDays,
          max_submissions: maxSubmissions,
          notes: `Link for ${contentTitle}`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate link");
      }

      setGeneratedLink(data.link.url);
      toast.success("Shareable link generated!");
      router.refresh();
    } catch (error: any) {
      console.error("Error generating link:", error);
      toast.error(error.message || "Failed to generate link");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      toast.success("Link copied to clipboard!");
    }
  };

  const handleClose = () => {
    setGeneratedLink(null);
    setExpiresInDays(30);
    setMaxSubmissions(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Generate Shareable Link</DialogTitle>
          <DialogDescription>
            Create an external evaluation link for: <strong>{contentTitle}</strong>
          </DialogDescription>
        </DialogHeader>

        {generatedLink ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 space-y-3">
                  <h4 className="font-semibold text-green-900">Link Generated Successfully!</h4>
                  <div className="bg-white border rounded p-3 flex items-center justify-between gap-2">
                    <code className="text-sm text-gray-700 flex-1 break-all">
                      {generatedLink}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={copyToClipboard}
                      className="flex-shrink-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={copyToClipboard}
                      className="flex-1"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Link
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      asChild
                      className="flex-1"
                    >
                      <a href={generatedLink} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open Link
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expires">Expires In (Days)</Label>
                <Input
                  id="expires"
                  type="number"
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(parseInt(e.target.value) || 30)}
                  min={1}
                  max={365}
                />
              </div>
              <div>
                <Label htmlFor="max">Max Submissions</Label>
                <Input
                  id="max"
                  type="number"
                  value={maxSubmissions || ""}
                  onChange={(e) =>
                    setMaxSubmissions(e.target.value ? parseInt(e.target.value) : null)
                  }
                  placeholder="Unlimited"
                  min={1}
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <p className="text-sm text-blue-900">
                External evaluators will be able to access and evaluate this {contentType === "episode" ? "episode" : "one-liner"} through the generated link without requiring a system account.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="flex-1"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Link"
                )}
              </Button>
              <Button onClick={handleClose} variant="outline">
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
