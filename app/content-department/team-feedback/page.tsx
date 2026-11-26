import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TeamFeedbackPageClient } from "@/components/shared/team-feedback-page-client";
import { createClient } from "@/lib/supabase/server";
import { getTeamFeedbackStories } from "@/lib/feedback/team-feedback";

export const dynamic = "force-dynamic";

/** The content team sees exactly their content head's Team Feedback page */
export default async function ContentTeamFeedbackPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "content_creator" && user.role !== "content_manager") redirect("/content-department");

  const supabase = await createClient();
  const { data: userProfile } = await supabase
    .from("users")
    .select("team_id")
    .eq("id", user.id)
    .single();

  const stories = await getTeamFeedbackStories(userProfile?.team_id ?? null);

  return (
    <div className="mobile-container mobile-section space-y-4 sm:space-y-6 max-w-5xl mx-auto">
      <TeamFeedbackPageClient stories={stories} />
    </div>
  );
}
