import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OneLinerForm } from "./one-liner-form";

export const metadata = {
  title: "One-Liner Submission | Evaluator Portal",
  description: "Submit a detailed one-liner for story evaluation",
};

export default async function OneLinerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user role
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  // Check if user is evaluator, content_manager, or admin
  if (
    !userData ||
    !["evaluator", "content_manager", "admin"].includes(userData.role)
  ) {
    redirect("/dashboard");
  }

  return <OneLinerForm />;
}
