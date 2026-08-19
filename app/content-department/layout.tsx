import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BsLayoutWrapper } from "@/components/content-department/bento-studio/bs-layout-wrapper";

export default async function ContentDepartmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // Redirect if user is not authenticated or not in content department
  if (!user) {
    redirect("/login");
  }

  // Only allow content department users (both managers and creators)
  // Evaluators are not allowed in the main content department area
  if (user.role !== "content_creator" && user.role !== "content_manager") {
    redirect("/dashboard");
  }

  // Fetch user's team with team head name for the badge
  let teamName: string | null = null;
  try {
    const supabase = await createClient();

    // Step 1: Get user's team_id (own row — always allowed by RLS)
    const { data: userData } = await supabase
      .from("users")
      .select("team_id")
      .eq("id", user.id)
      .single();

    // Step 2: Get team with team head name (teams table → single join to users)
    if (userData?.team_id) {
      const { data: team } = await supabase
        .from("teams")
        .select("name, team_head:users!team_head_id(name)")
        .eq("id", userData.team_id)
        .single();

      const headName = Array.isArray(team?.team_head)
        ? team.team_head[0]?.name
        : (team?.team_head as any)?.name;
      teamName = headName ? `${headName}'s Team` : team?.name || null;
    }
  } catch {
    // Silent fail — badge is non-critical
  }

  const navItems = [
    {
      title: "Dashboard",
      href: "/content-department",
      icon: "home",
    },
    {
      title: "AI Assistant",
      href: "/content-department/ai-assistant",
      icon: "sparkles",
    },
    {
      title: "Calendar",
      href: "/content-department/calendar",
      icon: "calendar",
    },
    {
      title: "One-Liner Reports",
      href: "/content-department/call-reports",
      icon: "fileText",
    },
    {
      title: "Episodes",
      href: "/content-department/episodes",
      icon: "film",
    },
    {
      title: "Evaluations",
      href: "/content-department/evaluations",
      icon: "clipboardList",
    },
    {
      title: "Notifications",
      href: "/content-department/notifications",
      icon: "bell",
    },
  ];

  return (
    <BsLayoutWrapper
      userName={user.name || "User"}
      userEmail={user.email}
      userPosition={user.position}
      teamName={teamName}
      navItems={navItems}
      showAIButton
    >
      {children}
    </BsLayoutWrapper>
  );
}