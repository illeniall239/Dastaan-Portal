"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getCallReportClient } from "@/lib/meetings/client";
import { CallReportForm } from "@/app/evaluator/log-call-report/call-report-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, FileText } from "lucide-react";
import Link from "next/link";
import { BackButton } from "@/components/ui/back-button";

interface CallReportEditPageProps {
  params: Promise<{ id: string }>;
}

export default function EvaluatorCallReportEditPage({ params }: CallReportEditPageProps) {
  const router = useRouter();
  const supabase = createClient();

  const [callReportId, setCallReportId] = useState<string | null>(null);
  const [callReport, setCallReport] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [userPosition, setUserPosition] = useState<string>("");
  const [attachments, setAttachments] = useState<Array<{
    id: string;
    file_name: string;
    file_path: string;
    file_size?: number | null;
    file_type?: string | null;
    uploaded_at?: string | null;
    public_url?: string | null;
  }>>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const resolvedParams = await params;
        setCallReportId(resolvedParams.id);

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error("Unauthorized");
          router.push("/login");
          return;
        }

        // Get user profile
        const { data: userData } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single();

        if (!userData || !["evaluator", "content_creator", "content_manager", "admin"].includes(userData.role)) {
          toast.error("Forbidden - Insufficient permissions");
          router.push("/evaluator/call-reports");
          return;
        }

        setUserId(user.id);
        setUserName(userData.name || userData.email);
        setUserPosition(userData.department || userData.role);

        // Fetch call report
        const callReportData = await getCallReportClient(resolvedParams.id);
        console.log("📊 EDIT PAGE - Call Report Data:", callReportData);
        console.log("📊 EDIT PAGE - Genre:", callReportData.genre);
        console.log("📊 EDIT PAGE - Target Slot:", callReportData.target_slot);
        setCallReport(callReportData);

        const { data: attachmentsData } = await supabase
          .from("attachments")
          .select("id, file_name, file_path, file_size, file_type, uploaded_at")
          .eq("entity_type", "call_report")
          .eq("entity_id", resolvedParams.id)
          .order("uploaded_at", { ascending: false });

        const attachmentsWithUrl =
          attachmentsData?.map((attachment) => {
            const { data: publicUrlData } = supabase.storage
              .from("attachments")
              .getPublicUrl(attachment.file_path);
            return {
              ...attachment,
              public_url: publicUrlData.publicUrl,
            };
          }) || [];

        setAttachments(attachmentsWithUrl);
        console.log("📎 EDIT PAGE - Attachments fetched:", attachmentsWithUrl);

        // Check permissions: owner or manager/admin
        const hasEditPermission =
          callReportData.created_by === user.id ||
          ["content_manager", "admin"].includes(userData.role);

        if (!hasEditPermission) {
          toast.error("You don't have permission to edit this call report");
          router.push("/evaluator/call-reports");
          return;
        }

        setCanEdit(true);
        setLoading(false);
      } catch (error: any) {
        console.error("Error loading call report:", error);
        toast.error(error.message || "Failed to load call report");
        router.push("/evaluator/call-reports");
      }
    };

    loadData();
  }, [params, router, supabase]);

  if (loading) {
    return (
      <div className="mobile-container mobile-section">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (!callReport || !canEdit) {
    return (
      <div className="mobile-container mobile-section">
        <Card className="p-12 text-center">
          <FileText className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Call Report Not Found</h2>
          <p className="text-muted-foreground mb-6">
            The call report you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to edit it.
          </p>
          <BackButton fallbackHref="/evaluator/call-reports" />
        </Card>
      </div>
    );
  }

  return (
    <div className="mobile-container mobile-section space-y-4 sm:space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <BackButton fallbackHref="/evaluator/call-reports" className="mb-4" />

        <div>
          <h1 className="text-xl sm:text-2xl font-bold mb-2">Edit Writer Engagement Report</h1>
          <p className="text-muted-foreground">
            Update the writer engagement report details
          </p>
        </div>
      </div>

      {/* Edit Form */}
      <CallReportForm
        mode="edit"
        initialData={callReport}
        callReportId={callReportId!}
        userId={userId}
        userName={userName}
        userPosition={userPosition}
        initialAttachments={attachments}
        onSuccess={() => {
          router.push(`/evaluator/call-reports/${callReportId}`);
        }}
      />
    </div>
  );
}
