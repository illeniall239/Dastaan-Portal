import { createClient } from "@/lib/supabase/client";
import type { DetailedOneLinerFormData } from "@/lib/validations/detailed-one-liner";
import type { DetailedOneLinerWithDetails } from "@/types";

/**
 * Create a new detailed one-liner from client components
 */
export async function createDetailedOneLinerClient(formData: DetailedOneLinerFormData) {
  const response = await fetch("/api/detailed-one-liner", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(formData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create detailed one-liner");
  }

  const result = await response.json();
  return result.data;
}

/**
 * Get a detailed one-liner by ID from client components
 */
export async function getDetailedOneLinerClient(id: string): Promise<DetailedOneLinerWithDetails> {
  const response = await fetch(`/api/detailed-one-liner/${id}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch detailed one-liner");
  }

  const result = await response.json();
  return result.data;
}

/**
 * Get available call reports that don't have a detailed one-liner yet
 */
export async function getAvailableCallReportsClient() {
  const supabase = createClient();

  // Get all call reports
  const { data: callReports, error } = await supabase
    .from("call_reports")
    .select("id, call_report_id, working_title, writer_name, meeting_date")
    .eq("meeting_type", "call_report")
    .order("meeting_date", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error("Failed to fetch call reports");
  }

  // Get all call reports that already have a detailed one-liner
  const { data: existingOneLiners } = await supabase
    .from("detailed_one_liners")
    .select("call_report_id");

  const existingCallReportIds = new Set(
    existingOneLiners?.map((ol) => ol.call_report_id) || []
  );

  // Filter out call reports that already have a detailed one-liner
  const available = callReports?.filter(
    (cr) => !existingCallReportIds.has(cr.id)
  ) || [];

  return available;
}
